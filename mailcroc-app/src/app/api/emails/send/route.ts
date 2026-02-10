import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// POST: Send email from temp address or forward to real address
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, from, to, subject, body: emailBody, replyTo } = body;

        if (!action || !from || !to) {
            return NextResponse.json({ error: 'action, from, and to required' }, { status: 400 });
        }

        // Create transporter using local SMTP
        const transporter = nodemailer.createTransport({
            host: '127.0.0.1',
            port: parseInt(process.env.SMTP_PORT || '25'),
            secure: false,
            tls: { rejectUnauthorized: false },
        });

        if (action === 'reply' || action === 'compose') {
            await transporter.sendMail({
                from: from,
                to: to,
                subject: subject || '(No Subject)',
                text: emailBody || '',
                inReplyTo: replyTo || undefined,
                attachments: body.attachments?.map((att: any) => ({
                    filename: att.name,
                    content: att.content.split(',')[1], // Remove Prefix
                    encoding: 'base64',
                    contentType: att.type,
                })),
            });
            return NextResponse.json({ success: true, message: 'Email sent' });
        }

        if (action === 'forward') {
            await transporter.sendMail({
                from: from,
                to: to,
                subject: subject ? `Fwd: ${subject}` : 'Forwarded Email',
                text: emailBody || '',
                html: body.html || undefined,
                attachments: body.attachments?.map((att: any) => ({
                    filename: att.name,
                    content: att.content.split(',')[1],
                    encoding: 'base64',
                    contentType: att.type,
                })),
            });
            return NextResponse.json({ success: true, message: 'Email forwarded' });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (e: any) {
        console.error('Send email error:', e);
        return NextResponse.json({ error: e.message || 'Failed to send' }, { status: 500 });
    }
}
