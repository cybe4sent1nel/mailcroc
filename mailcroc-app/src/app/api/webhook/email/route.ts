import { NextRequest, NextResponse } from 'next/server';
import { saveEmail, getReplyRoute } from '@/lib/github-db';
import { analyzeEmail } from '@/lib/ai';
import { analyzeThreatsAndCleanHTML } from '@/lib/security';

/**
 * Webhook endpoint for Cloudflare Email Worker.
 * Receives parsed email data and saves to GitHub repo.
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

        // Analyze content
        const extractEmail = (str: string) => {
            const match = str.match(/<(.+)>/);
            return (match ? match[1] : str).trim().toLowerCase();
        };
        const rawTo = Array.isArray(body.to) ? body.to : [body.to];
        let cleanedTo = rawTo.map(extractEmail).filter(Boolean);

        // --- REPLY ROUTING INTERCEPTION ---
        // If someone replied directly to a relay address, check if we mapped their incoming address (from)
        // to a specific user's temp address based on previous outgoing emails.
        const originalFrom = extractEmail(body.from || '');
        const routeDest = await getReplyRoute(originalFrom);
        if (routeDest) {
            console.log(`[ROUTE MATCH] Intercepted reply from ${originalFrom}. Re-routing to ${routeDest}`);
            cleanedTo = [routeDest];
        }

        // Deep Security Scan & AI Analysis
        const analysis = await analyzeEmail(body.subject || '', body.text || '');
        const security = analyzeThreatsAndCleanHTML(body.from || '', body.subject || '', body.html || '');

        // Merge threat intelligence (Static logic overrides AI false-negatives)
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
            ownerSessionId: body.ownerSessionId || undefined // Allow override from request
        });

        console.log(`Webhook: saved email from ${body.from} to ${body.to}`);

        // Notify Socket.IO server (Render backend) for real-time updates
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
                    ownerSessionId: savedEmail.ownerSessionId
                }),
            });
            if (!notifyRes.ok) {
                console.error(`Socket server notification failed with status: ${notifyRes.status}`);
            }
        } catch (err: unknown) {
            console.error('Notification error:', (err as Error).message);
        }

        return NextResponse.json({ success: true, id: savedEmail._id }, {
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
