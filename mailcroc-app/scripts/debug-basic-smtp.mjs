import nodemailer from 'nodemailer';

async function debug() {
    const {
        SMTP_USER,
        SMTP_PASS,
        SMTP_HOST,
        SMTP_PORT
    } = process.env;

    console.log("Checking Basic SMTP credentials...");
    console.log("SMTP_USER:", SMTP_USER);
    console.log("SMTP_PASS:", SMTP_PASS ? "PRESENT" : "MISSING");

    if (!SMTP_USER || !SMTP_PASS) {
        console.error("Missing Basic SMTP credentials in .env.local");
        return;
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(SMTP_PORT || '465'),
        secure: true,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    const mailOptions = {
        from: `"${SMTP_USER}" <${SMTP_USER}>`,
        to: 'fahadkhanxyz8816@gmail.com',
        subject: 'MailCroc Basic SMTP Debug - ' + new Date().toLocaleString(),
        text: 'Nodemailer basic SMTP test message.',
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
