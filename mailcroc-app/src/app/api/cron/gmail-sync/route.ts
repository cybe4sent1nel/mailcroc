import { NextRequest, NextResponse } from 'next/server';
import { saveEmail, getReplyRoute } from '@/lib/github-db';
import { analyzeEmail } from '@/lib/ai';
import { analyzeThreatsAndCleanHTML } from '@/lib/security';

async function getGmailAccessToken() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) return null;

    try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GMAIL_CLIENT_ID,
                client_secret: GMAIL_CLIENT_SECRET,
                refresh_token: GMAIL_REFRESH_TOKEN,
                grant_type: 'refresh_token'
            })
        });
        const data = await response.json();
        return response.ok ? data.access_token : null;
    } catch (err) {
        console.error('Failed to refresh GMail token:', err);
        return null;
    }
}

function getHeader(headers: any[], name: string) {
    const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
}

function decodeBase64URL(str: string) {
    if (!str) return '';
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function getBodyData(payload: any): { text: string; html: string } {
    let text = '';
    let html = '';

    if (payload.body && payload.body.data) {
        if (payload.mimeType === 'text/html') html = decodeBase64URL(payload.body.data);
        else text = decodeBase64URL(payload.body.data);
    }

    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                text = decodeBase64URL(part.body.data);
            } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
                html = decodeBase64URL(part.body.data);
            } else if (part.parts) {
                const sub = getBodyData(part);
                if (sub.text && !text) text = sub.text;
                if (sub.html && !html) html = sub.html;
            }
        }
    }

    return { text, html };
}

function extractEmailStr(str: string) {
    const match = str.match(/<(.+)>/);
    return (match ? match[1] : str).trim().toLowerCase();
}

/**
 * GET /api/cron/gmail-sync
 * Polls the authorized Gmail Inbox for UNREAD emails sent to `wecare.woven+*@gmail.com`
 * Downloads them into the MailCroc ecosystem, notifies the UI, and marks them READ in Gmail.
 */
export async function GET(req: NextRequest) {
    try {
        const accessToken = await getGmailAccessToken();
        if (!accessToken) {
            return NextResponse.json({ error: 'Failed to authenticate with Gmail API' }, { status: 500 });
        }

        // Search for unread emails sent to the base address (which inherently includes all +aliases in Gmail)
        const query = 'is:unread to:wecare.woven@gmail.com';
        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const listData = await listRes.json();
        const messages = listData.messages || [];

        const syncedEmails = [];

        for (const msg of messages) {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const msgData = await msgRes.json();

            const headers = msgData.payload.headers;
            const rawFrom = getHeader(headers, 'From');
            const rawTo = getHeader(headers, 'To');
            const subject = getHeader(headers, 'Subject') || '(No Subject)';
            const messageId = getHeader(headers, 'Message-ID') || msg.id;

            // Clean the addresses
            const from = extractEmailStr(rawFrom);
            let toAddress = extractEmailStr(rawTo);

            // Double check reply routes just in case they sent to the base address
            const routeDest = await getReplyRoute(from);
            if (routeDest) {
                console.log(`[Gmail Sync] Intercepted routed mapped reply from ${from}. Re-routing to ${routeDest}`);
                toAddress = routeDest;
            }

            const bodyParts = getBodyData(msgData.payload);
            const textContent = bodyParts.text || '';
            const htmlContent = bodyParts.html || textContent;

            // Run AI Analysis
            const analysis = await analyzeEmail(subject, textContent);
            const security = analyzeThreatsAndCleanHTML(from, subject, htmlContent);

            const finalIsThreat = analysis.isThreat || security.isThreat;
            const finalThreatReason = security.threatReason || analysis.threatReason;

            // Save to DB under the specific alias address
            const savedEmail = await saveEmail({
                from: rawFrom || 'unknown',
                to: [toAddress],
                subject: subject,
                text: textContent,
                html: security.cleanHtml,
                messageId: messageId,
                category: analysis.category,
                isThreat: finalIsThreat,
                threatReason: finalThreatReason,
                blockedTrackers: security.blockedTrackers,
                summary: analysis.summary
            });

            console.log(`[Gmail Sync] Pulled and saved email from ${from} to ${toAddress}`);

            // Notify Socket.IO Server instantly
            try {
                const socketServerUrl = process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://127.0.0.1:3001';
                await fetch(`${socketServerUrl}/notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        _id: savedEmail._id,
                        from: savedEmail.from,
                        to: savedEmail.to,
                        subject: savedEmail.subject,
                        text: savedEmail.text,
                        html: savedEmail.html,
                        isThreat: savedEmail.isThreat,
                        threatReason: savedEmail.threatReason,
                        blockedTrackers: savedEmail.blockedTrackers,
                        ownerSessionId: undefined // Broadcast to everyone listening to `toAddress`
                    })
                });
            } catch (notifyErr) {
                console.error('Socket notification failed:', notifyErr);
            }

            // Mark message as READ in Gmail so we don't fetch it again
            await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    removeLabelIds: ['UNREAD']
                })
            });

            syncedEmails.push(toAddress);
        }

        return NextResponse.json({ success: true, count: syncedEmails.length, targets: syncedEmails });
    } catch (e) {
        console.error('Gmail Sync error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
