import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Node --env-file will be used instead

async function debug() {
    const {
        SMTP_USER,
        GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET,
        GMAIL_REFRESH_TOKEN
    } = process.env;

    console.log("Checking credentials...");
    console.log("SMTP_USER:", SMTP_USER);
    console.log("GMAIL_CLIENT_ID:", GMAIL_CLIENT_ID ? "PRESENT" : "MISSING");

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
        console.error("Missing GMail OAuth2 credentials in .env.local");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: SMTP_USER || 'wecare.woven@gmail.com',
            clientId: GMAIL_CLIENT_ID,
            clientSecret: GMAIL_CLIENT_SECRET,
            refreshToken: GMAIL_REFRESH_TOKEN,
        },
    });

    const mailOptions = {
        from: `"${SMTP_USER}" <${SMTP_USER}>`,
        to: 'fahadkhanxyz8816@gmail.com',
        subject: 'MailCroc Direct Debug - ' + new Date().toLocaleString(),
        text: 'Nodemailer direct test message.',
    };

    console.log("Attempting to send email...");
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Success! Message sent: %s", info.messageId);
    } catch (error) {
        console.error("❌ Failed!");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        console.error("Full Error:", error);
    }
}

debug();
