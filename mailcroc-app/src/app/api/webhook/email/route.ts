import { NextRequest, NextResponse } from 'next/server';
import { saveEmail } from '@/lib/github-db';

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

        const savedEmail = await saveEmail({
            from: body.from || 'unknown',
            to: Array.isArray(body.to) ? body.to : [body.to],
            subject: body.subject || '(No Subject)',
            text: body.text || '',
            html: body.html || '',
            messageId: body.messageId || '',
        });

        console.log(`Webhook: saved email from ${body.from} to ${body.to}`);

        // Notify Socket.IO server (Render backend) for real-time updates
        try {
            const socketServerUrl = process.env.SOCKET_SERVER_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://127.0.0.1:3001';
            fetch(`${socketServerUrl}/notify`, {
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
                }),
            }).catch(e => console.error('Failed to notify socket server:', e.message));
        } catch (err) {
            console.error('Notification error:', err);
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
