import { NextResponse } from 'next/server';
import { saveEmail, getReplyRoute, getAddressOwner } from '@/lib/github-db';
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

function getHeader(headers: { name: string, value: string }[], name: string) {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
}

function decodeBase64URL(str: string) {
    if (!str) return '';
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function getBodyData(payload: { body?: { data?: string }, mimeType?: string, parts?: unknown[] }): { text: string; html: string } {
    let text = '';
    let html = '';

    if (payload.body && payload.body.data) {
        if (payload.mimeType === 'text/html') html = decodeBase64URL(payload.body.data);
        else text = decodeBase64URL(payload.body.data);
    }

    if (payload.parts) {
        for (const part of payload.parts) {
            const p = part as { body?: { data?: string }, mimeType?: string, parts?: unknown[] };
            if (p.mimeType === 'text/plain' && p.body && p.body.data) {
                text = decodeBase64URL(p.body.data);
            } else if (p.mimeType === 'text/html' && p.body && p.body.data) {
                html = decodeBase64URL(p.body.data);
            } else if (p.parts) {
                const sub = getBodyData(p);
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
 * Normalize email: lowercase, trim, and map @googlemail.com → @gmail.com
 */
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim().replace(/@googlemail\.com$/, '@gmail.com');
}

/**
 * GET /api/cron/gmail-sync
 * Polls the authorized Gmail Inbox for UNREAD emails sent to `wecare.woven+*@gmail.com` or `@googlemail.com`.
 * Downloads them into the MailCroc ecosystem with proper session isolation.
 */
export async function GET() {
    try {
        const accessToken = await getGmailAccessToken();
        if (!accessToken) {
            return NextResponse.json({ error: 'Failed to authenticate with Gmail API' }, { status: 500 });
        }

        // Search for ALL unread emails — Gmail automatically delivers +alias emails to the base inbox.
        // We catch them all here and route them to the correct alias folder in our system.
        const query = 'is:unread';
        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`, {
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

            const hdrs = msgData.payload.headers;
            const rawFrom = getHeader(hdrs, 'From');
            const rawTo = getHeader(hdrs, 'To');
            const rawDeliveredTo = getHeader(hdrs, 'Delivered-To');
            const rawXOrigTo = getHeader(hdrs, 'X-Original-To');
            const subject = getHeader(hdrs, 'Subject') || '(No Subject)';
            const messageId = getHeader(hdrs, 'Message-ID') || msg.id;

            // Clean & normalize the addresses
            const from = normalizeEmail(extractEmailStr(rawFrom));

            // Determine the actual alias recipient.
            // Priority: X-Original-To > Delivered-To > To header
            // This ensures we capture the actual +alias address, not just the base address after forwarding.
            let toAddress = normalizeEmail(extractEmailStr(rawXOrigTo || rawDeliveredTo || rawTo));

            // Check reply routes — if the sender was previously sent a mail from a temp address, reroute
            const routeDest = await getReplyRoute(from);
            if (routeDest) {
                console.log(`[Gmail Sync] Reply route matched: ${from} → ${routeDest}`);
                toAddress = normalizeEmail(routeDest);
            }

            const bodyParts = getBodyData(msgData.payload);
            const textContent = bodyParts.text || '';
            const htmlContent = bodyParts.html || textContent;

            // Run AI Analysis (OpenRouter primary)
            const analysis = await analyzeEmail(subject, textContent);
            const security = analyzeThreatsAndCleanHTML(from, subject, htmlContent);

            const finalIsThreat = analysis.isThreat || security.isThreat;
            const finalThreatReason = security.threatReason || analysis.threatReason;

            // --- SESSION ISOLATION ---
            // Look up who owns this alias address to attach the correct ownerSessionId
            const addressOwner = await getAddressOwner(toAddress);
            const ownerSessionId = addressOwner?.sessionId || null;

            // Save to DB under the specific alias address with session ownership
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
                summary: analysis.summary,
                ownerSessionId: ownerSessionId || undefined
            });

            console.log(`[Gmail Sync] Saved email from ${from} → ${toAddress} (session: ${ownerSessionId || 'none'})`);

            // Notify Socket.IO Server for real-time push with ownerSessionId
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
                        receivedAt: savedEmail.receivedAt,
                        isThreat: savedEmail.isThreat,
                        threatReason: savedEmail.threatReason,
                        blockedTrackers: savedEmail.blockedTrackers,
                        summary: savedEmail.summary,
                        ownerSessionId: ownerSessionId  // Session-targeted notification
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
