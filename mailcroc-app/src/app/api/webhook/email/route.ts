import { NextRequest, NextResponse } from 'next/server';
import { saveEmail, getReplyRoute, getAddressOwner } from '@/lib/github-db';
import { analyzeEmail } from '@/lib/ai';
import { analyzeThreatsAndCleanHTML } from '@/lib/security';

/**
 * Normalize email: lowercase, trim, @googlemail.com → @gmail.com
 */
function normalizeEmail(email: string): string {
    return email.toLowerCase().trim().replace(/@googlemail\.com$/, '@gmail.com');
}

/**
 * Webhook endpoint for Cloudflare Email Worker.
 * Receives parsed email data and saves to GitHub repo.
 *
 * IMPORTANT: When Gmail forwards to inbox@mailcroc.qzz.io, the raw "To" field
 * becomes inbox@mailcroc.qzz.io. We must detect this and resolve the
 * original alias from the email headers (Delivered-To, X-Original-To, etc.)
 * or from the original To header preserved in the forwarded email text/headers.
 */
export async function POST(req: NextRequest) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    // Verify webhook secret
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, {
            status: 401,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }

    try {
        const body = await req.json();

        const extractEmail = (str: string) => {
            const match = str.match(/<(.+)>/);
            return (match ? match[1] : str).trim().toLowerCase();
        };

        const rawTo = Array.isArray(body.to) ? body.to : [body.to];
        let cleanedTo = rawTo.map(extractEmail).filter(Boolean);

        // --- GMAIL FORWARDING DETECTION ---
        // When Gmail forwards to inbox@mailcroc.qzz.io, the To field becomes our
        // forwarding address. We need to detect this and resolve the ORIGINAL alias.
        const gmailUsername = (process.env.NEXT_PUBLIC_GMAIL_USERNAME || '').split('@')[0].toLowerCase();
        const isForwardedToUs = cleanedTo.some((addr: string) =>
            addr === 'inbox@mailcroc.qzz.io' ||
            addr.endsWith('@mailcroc.qzz.io') ||
            addr.endsWith('@mailpanda.qzz.io')
        );

        if (isForwardedToUs && gmailUsername) {
            // Try to resolve the original alias from various sources:
            // 1. body.originalTo — Cloudflare worker may pass this
            // 2. body.deliveredTo — original Delivered-To header
            // 3. body.headers — raw email headers from the worker
            // 4. Scan the email text/html for the original "To:" line

            let resolvedAlias = '';

            // Source 1: Cloudflare worker passes originalTo
            if (body.originalTo) {
                resolvedAlias = normalizeEmail(extractEmail(
                    Array.isArray(body.originalTo) ? body.originalTo[0] : body.originalTo
                ));
            }

            // Source 2: Delivered-To header
            if (!resolvedAlias && body.deliveredTo) {
                const delivered = normalizeEmail(extractEmail(body.deliveredTo));
                if (delivered.includes('+')) {
                    resolvedAlias = delivered;
                }
            }

            // Source 3: Raw headers from Cloudflare worker
            if (!resolvedAlias && body.headers) {
                const headerStr = typeof body.headers === 'string' ? body.headers : JSON.stringify(body.headers);
                // Look for X-Forwarded-To, Delivered-To, or original To with alias
                const aliasMatch = headerStr.match(
                    new RegExp(`${gmailUsername}\\+[^@]+@(?:gmail\\.com|googlemail\\.com)`, 'i')
                );
                if (aliasMatch) {
                    resolvedAlias = normalizeEmail(aliasMatch[0]);
                }
            }

            // Source 4: Scan email content for the original To: line (Gmail forwarded text)
            if (!resolvedAlias) {
                const textToScan = (body.text || '') + (body.html || '');
                const aliasInBody = textToScan.match(
                    new RegExp(`${gmailUsername}\\+[a-z0-9._-]+@(?:gmail\\.com|googlemail\\.com)`, 'i')
                );
                if (aliasInBody) {
                    resolvedAlias = normalizeEmail(aliasInBody[0]);
                }
            }

            if (resolvedAlias) {
                console.log(`[Webhook] Gmail forwarding detected. Resolved alias: ${resolvedAlias}`);
                cleanedTo = [resolvedAlias];
            } else {
                console.log(`[Webhook] Gmail forwarding detected but could not resolve alias. Using original To: ${cleanedTo.join(', ')}`);
            }
        }

        // --- REPLY ROUTING INTERCEPTION ---
        const originalFrom = extractEmail(body.from || '');
        const routeDest = await getReplyRoute(originalFrom);
        if (routeDest) {
            console.log(`[ROUTE MATCH] Intercepted reply from ${originalFrom}. Re-routing to ${routeDest}`);
            cleanedTo = [normalizeEmail(routeDest)];
        }

        // --- SESSION ISOLATION ---
        // Look up the owner of the target address
        let ownerSessionId = body.ownerSessionId || undefined;
        if (!ownerSessionId && cleanedTo.length > 0) {
            const addressOwner = await getAddressOwner(cleanedTo[0]);
            ownerSessionId = addressOwner?.sessionId || undefined;
        }

        // Deep Security Scan & AI Analysis
        const analysis = await analyzeEmail(body.subject || '', body.text || '');
        const security = analyzeThreatsAndCleanHTML(body.from || '', body.subject || '', body.html || '');

        const finalIsThreat = analysis.isThreat || security.isThreat;
        const finalThreatReason = security.threatReason || analysis.threatReason;

        const savedEmail = await saveEmail({
            from: body.from || 'unknown',
            to: cleanedTo,
            subject: body.subject || '(No Subject)',
            text: body.text || '',
            html: security.cleanHtml,
            messageId: body.messageId || '',
            category: analysis.category,
            isThreat: finalIsThreat,
            threatReason: finalThreatReason,
            blockedTrackers: security.blockedTrackers,
            summary: analysis.summary,
            attachments: body.attachments || [],
            ownerSessionId: ownerSessionId
        });

        console.log(`Webhook: saved email from ${body.from} to ${cleanedTo.join(', ')} (session: ${ownerSessionId || 'none'})`);

        // Notify Socket.IO server for REAL-TIME push via Socket.IO + SSE
        try {
            const socketServerUrl = process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://127.0.0.1:3001';
            const notifyRes = await fetch(`${socketServerUrl}/notify`, {
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
                    pinned: savedEmail.pinned,
                    category: savedEmail.category,
                    isThreat: savedEmail.isThreat,
                    threatReason: savedEmail.threatReason,
                    blockedTrackers: savedEmail.blockedTrackers,
                    summary: savedEmail.summary,
                    ownerSessionId: ownerSessionId
                }),
            });
            if (!notifyRes.ok) {
                console.error(`Socket server notification failed with status: ${notifyRes.status}`);
            }
        } catch (err: unknown) {
            console.error('Notification error:', (err as Error).message);
        }

        return NextResponse.json({ success: true, id: savedEmail._id, to: cleanedTo }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    } catch (err) {
        console.error('Webhook error:', err);
        return NextResponse.json({ error: 'Internal server error' }, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
