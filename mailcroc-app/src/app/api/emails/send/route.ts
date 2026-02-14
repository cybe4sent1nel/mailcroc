import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { MailSlurp } from 'mailslurp-client';
// @ts-ignore
import MailComposer from 'nodemailer/lib/mail-composer';

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
        console.error("Failed to refresh GMail token:", err);
        return null;
    }
}

async function sendWithMailSlurp(to: string, subject: string, body: string, isHTML: boolean) {
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
            isHTML: isHTML,
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

        console.log("[Send API] Environment Check:", {
            SMTP_USER: !!process.env.SMTP_USER,
            GMAIL_CLIENT_ID: !!process.env.GMAIL_CLIENT_ID,
            MAILSLURP_API_KEY: !!process.env.MAILSLURP_API_KEY
        });

        // Multi-Stage Sending Fallback Logic
        const {
            GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN,
            SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
        } = process.env;

        // Determine Relay Address based on domain
        const domain = from.split('@')[1];
        let relayAddress = from; // Fallback to 'from' if not our domain
        if (domain === 'mailcroc.qzz.io') {
            relayAddress = 'relay@mailcroc.qzz.io';
        } else if (domain === 'mailpanda.qzz.io') {
            relayAddress = 'relay@mailpanda.qzz.io';
        }

        // Customized From Header: "temp@domain" <relay@domain>
        const customFrom = `"${from}" <${relayAddress}>`;

        let finalBody = emailBody || '';
        let portalLink = '';

        if (body.isPasswordProtected) {
            const { saveSecureMessage } = await import('@/lib/github-db');

            const securePayload = {
                content: finalBody,
                attachments: body.attachments?.map((att: any) => ({
                    name: att.name,
                    data: att.content,
                    type: att.type,
                    size: att.size
                })) || []
            };

            const secureId = await saveSecureMessage(JSON.stringify(securePayload));
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mailcroc.qzz.io';
            portalLink = `${baseUrl}/secure-view/${secureId}`;

            finalBody = `You have received a secure, password-protected message via MailCroc.\n\nTo view this message, please click the link below and enter the shared password:\n\n${portalLink}\n\n---\nMailCroc - Secure Temporary Email`;
        }

        const mailOptions: any = {
            from: customFrom,
            to: to,
            subject: subject || '(No Subject)',
            attachments: body.isPasswordProtected ? [] : body.attachments?.map((att: any) => ({
                filename: att.name,
                content: att.content.split(',')[1],
                encoding: 'base64',
                contentType: att.type,
            })),
        };

        const isHtml = /<[a-z][\s\S]*>/i.test(emailBody || '') || (emailBody || '').includes('<!DOCTYPE html>');
        if (body.isPasswordProtected) {
            mailOptions.text = finalBody;
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
        } else if (isHtml) {
            mailOptions.html = emailBody;
            mailOptions.text = (emailBody || '').replace(/<[^>]*>/g, '');
        } else {
            mailOptions.text = finalBody;
        }

        if (action === 'reply' || action === 'compose') {
            mailOptions.inReplyTo = replyTo || undefined;
        } else if (action === 'forward') {
            mailOptions.subject = subject ? `Fwd: ${subject}` : 'Forwarded Email';
        }

        const saveToDB = async () => {
            try {
                await import('@/lib/github-db').then(m => m.saveEmail({
                    from,
                    to: [to],
                    subject: subject || '(No Subject)',
                    text: emailBody || '',
                    html: emailBody || '',
                    messageId: `sent-${Date.now()}`,
                    receivedAt: new Date(),
                    folder: 'sent',
                    pinned: false
                }, from));
            } catch (dbErr) { console.error("Failed to save sent email to DB", dbErr); }
        };

        const getErrStr = (err: any) => {
            if (!err) return "Unknown Error";
            if (err instanceof Error) return `${err.name}: ${err.message}`;
            if (typeof err === 'object') {
                const props = Object.getOwnPropertyNames(err);
                const out: any = {};
                props.forEach(p => out[p] = (err as any)[p]);
                return JSON.stringify(out);
            }
            return String(err);
        };

        // Attempt 1: GMail REST API (Most Robust for OAuth2)
        const accessToken = await getGmailAccessToken();
        if (accessToken) {
            try {
                console.log("[Send API] Trying GMail REST API with refresh token...");

                // Use MailComposer to generate a proper MIME message
                const composer = new MailComposer(mailOptions);
                const messageBuffer = await composer.compile().build();
                const encodedMail = messageBuffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ raw: encodedMail })
                });

                if (sendResponse.ok) {
                    await saveToDB();
                    console.log("[Send API] Success via GMail REST API!");
                    return NextResponse.json({ success: true, message: 'Email sent via GMail REST API' });
                } else {
                    const errData = await sendResponse.json();
                    console.error("[Send API] GMail REST API Failed:", JSON.stringify(errData));
                }
            } catch (err: any) {
                console.error("[Send API] GMail REST API Exception:", getErrStr(err));
            }
        }

        // Attempt 2: Basic SMTP (App Password)
        if (SMTP_USER && SMTP_PASS) {
            try {
                console.log("[Send API] Trying Basic SMTP for sender:", from);
                const transporter = nodemailer.createTransport({
                    host: SMTP_HOST || 'smtp.gmail.com',
                    port: parseInt(SMTP_PORT || '465'),
                    secure: SMTP_SECURE === 'true' || SMTP_PORT === '465',
                    auth: { user: SMTP_USER, pass: SMTP_PASS },
                    tls: { rejectUnauthorized: false },
                });
                await transporter.sendMail(mailOptions);
                await saveToDB();
                console.log("[Send API] Success via Basic SMTP!");
                return NextResponse.json({ success: true, message: 'Email sent via Basic SMTP' });
            } catch (err: any) {
                console.error("[Send API] Basic SMTP Failed:", getErrStr(err));
            }
        }

        // Attempt 3: MailSlurp
        if (process.env.MAILSLURP_API_KEY) {
            try {
                console.log("[Send API] Trying MailSlurp Fallback...");
                await sendWithMailSlurp(to, subject || '(No Subject)', emailBody || '', isHtml);
                await saveToDB();
                console.log("[Send API] Success via MailSlurp!");
                return NextResponse.json({ success: true, message: 'Email sent via MailSlurp Fallback' });
            } catch (err: any) {
                const msErrMsg = getErrStr(err);
                console.error("[Send API] MailSlurp Failed:", msErrMsg);
                throw new Error(`All sending methods failed. Last error (MailSlurp): ${msErrMsg}`);
            }
        }
    } catch (e: any) {
        console.error('Send email error:', e);
        return NextResponse.json({ error: e.message || 'Failed to send' }, { status: 500 });
    }
}
