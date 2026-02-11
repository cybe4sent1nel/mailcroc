import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { MailSlurp } from 'mailslurp-client';

async function sendWithMailSlurp(to: string, subject: string, body: string) {
    if (!process.env.MAILSLURP_API_KEY) throw new Error("MailSlurp API Key missing");
    console.log("Using MailSlurp Fallback...");
    const mailslurp = new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY });
    const inbox = await mailslurp.inboxController.createInboxWithDefaults();
    if (!inbox.id) throw new Error("Failed to create MailSlurp inbox");
    await mailslurp.inboxController.sendEmailAndConfirm({
        inboxId: inbox.id,
        sendEmailOptions: {
            to: [to],
            subject: subject,
            body: body,
            isHTML: true,
        }
    });
    return true;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, from, to, subject, body: emailBody, replyTo } = body;

        if (!action || !from || !to) {
            return NextResponse.json({ error: 'action, from, and to required' }, { status: 400 });
        }

        // 1. Try Primary SMTP
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || '127.0.0.1',
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
                auth: process.env.SMTP_USER ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                } : undefined,
                tls: { rejectUnauthorized: false }, // Allow self-signed certs if needed
            });

            const mailOptions: any = {
                from: from,
                to: to,
                subject: subject || '(No Subject)',
                text: emailBody || '',
                attachments: body.attachments?.map((att: any) => ({
                    filename: att.name,
                    content: att.content.split(',')[1],
                    encoding: 'base64',
                    contentType: att.type,
                })),
            };

            if (action === 'reply' || action === 'compose') {
                mailOptions.inReplyTo = replyTo || undefined;
            } else if (action === 'forward') {
                mailOptions.subject = subject ? `Fwd: ${subject}` : 'Forwarded Email';
            }

            await transporter.sendMail(mailOptions);

            // Save to Sent Folder (DB)
            try {
                await import('@/lib/github-db').then(m => m.saveEmail({
                    from,
                    to: [to],
                    subject: subject || '(No Subject)',
                    text: emailBody || '',
                    html: emailBody || '', // simple text for now
                    messageId: `sent-${Date.now()}`,
                    receivedAt: new Date(),
                    folder: 'sent',
                    pinned: false
                }, from));
            } catch (dbErr) { console.error("Failed to save sent email to DB", dbErr); }

            return NextResponse.json({ success: true, message: 'Email sent via SMTP' });

        } catch (smtpError) {
            console.error("SMTP Failed, trying MailSlurp...", smtpError);

            // 2. Fallback to MailSlurp
            try {
                await sendWithMailSlurp(to, subject || '(No Subject)', emailBody || '');

                // Save to Sent Folder (DB)
                try {
                    await import('@/lib/github-db').then(m => m.saveEmail({
                        from,
                        to: [to],
                        subject: subject || '(No Subject)',
                        text: emailBody || '',
                        html: emailBody || '', // Assuming simple text for now, or we could pass HTML if we had it
                        messageId: `sent-${Date.now()}`,
                        receivedAt: new Date(),
                        folder: 'sent',
                        pinned: false
                    }, from));
                } catch (dbErr) { console.error("Failed to save sent email to DB", dbErr); }

                return NextResponse.json({ success: true, message: 'Email sent via MailSlurp Fallback' });
            } catch (msError: any) {
                console.error("MailSlurp Fallback Failed:", msError);
                throw new Error(`Sending failed: ${msError.message}`);
            }
        }
    } catch (e: any) {
        console.error('Send email error:', e);
        return NextResponse.json({ error: e.message || 'Failed to send' }, { status: 500 });
    }
}
