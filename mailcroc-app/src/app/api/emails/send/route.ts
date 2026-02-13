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

            let finalBody = emailBody || '';
            let portalLink = '';

            if (body.isPasswordProtected) {
                const { saveSecureMessage } = await import('@/lib/github-db');
                const secureId = await saveSecureMessage(finalBody);
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mailcroc.qzz.io';
                portalLink = `${baseUrl}/secure-view/${secureId}`;

                finalBody = `You have received a secure, password-protected message via MailCroc.\n\nTo view this message, please click the link below and enter the shared password:\n\n${portalLink}\n\n---\nMailCroc - Secure Temporary Email`;
            }

            const mailOptions: any = {
                from: from,
                to: to,
                subject: subject || '(No Subject)',
                text: finalBody,
                attachments: body.attachments?.map((att: any) => ({
                    filename: att.name,
                    content: att.content.split(',')[1],
                    encoding: 'base64',
                    contentType: att.type,
                })),
            };

            if (body.isPasswordProtected) {
                mailOptions.html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <img src="https://mailcroc.qzz.io/logo.png" width="40" height="40" alt="MailCroc Logo" style="display: block; margin: 0 auto 20px;">
                        <h2 style="text-align: center; color: #1e292a;">Secure Message Received</h2>
                        <p style="color: #475569; line-height: 1.6; text-align: center;">
                            <strong>${from}</strong> has sent you a password-protected email via <strong>MailCroc</strong>.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${portalLink}" style="background-color: #84cc16; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; display: inline-block;">
                                Unlock Secure Message
                            </a>
                        </div>
                        <p style="font-size: 0.875rem; color: #94a3b8; text-align: center;">
                            If the button above doesn't work, copy and paste this link into your browser:<br>
                            <a href="${portalLink}" style="color: #3b82f6;">${portalLink}</a>
                        </p>
                        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;">
                        <p style="font-size: 0.75rem; color: #cbd5e1; text-align: center;">
                            MailCroc - The World's Best Temporary Email Service. Privacy-first, secure, and fast.
                        </p>
                    </div>
                `;
            }

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
