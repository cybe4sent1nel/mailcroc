
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, incidentType, description, timestamp } = body;

        // Basic validation
        if (!name || !email || !description) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Configure transporter using existing environment variables
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false // Allow self-signed certs for local/dev
            }
        });

        // Email content
        const mailOptions = {
            from: `"MailCroc Status" <${process.env.SMTP_USER}>`,
            to: 'mailcroc.qzz.io', // As requested by user, though this looks like a domain not an email
            // Assuming the user meant an admin email AT that domain, or a catch-all.
            // But I will follow the instruction "send mail about a iciiciden t nd remove the browser toat the mail will be sent on mailcroc.qzz.io"
            // Wait, the user said "send mail about a iciiciden t nd remove the browser toat the mail will be sent on mailcroc.qzz.io"
            // It might mean "send mail TO mailcroc.qzz.io" or "THE mail will be sent ON mailcroc.qzz.io" (as in, using that server).
            // Given "send mail ... on mailcroc.qzz.io", and I'm using the SMTP server which IS likely mailcroc.qzz.io (or configured to use it).
            // Let's assume the user wants the report sent TO an admin email.
            // I'll send it to "admin@mailcroc.qzz.io" as a safe bet, or "support@mailcroc.qzz.io".
            // Actually, looking at the prompt: "create a moadl that alloaes users to send mail about a iciiciden t nd remove the browser toat the mail will be sent on mailcroc.qzz.io"
            // It's a bit ambiguous. Let's send to "admin@mailcroc.qzz.io" and also CC the user.
            subject: `[Incident Report] ${incidentType.toUpperCase()} - ${name}`,
            text: `
New Incident Report Received

Reporter: ${name}
Email: ${email}
Type: ${incidentType}
Time: ${new Date(timestamp).toLocaleString()}

Description:
${description}

---------------------------------------------------
System Status Dashboard
            `,
            html: `
<div style="font-family: sans-serif; padding: 20px; background: #fffcf8; color: #334155;">
    <h2 style="color: #1e293b;">New Incident Report</h2>
    <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <p><strong>Reporter:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Type:</strong> <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${incidentType.toUpperCase()}</span></p>
        <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <h3 style="color: #1e293b;">Description</h3>
        <p style="white-space: pre-wrap; line-height: 1.6;">${description}</p>
    </div>
</div>
            `
        };

        // For safety, let's actually double check where to send.
        // If I can't determine, I'll send to the SMTP_USER which is likely the admin account.
        // Let's modify 'to' to be process.env.SMTP_USER assuming it's an email address.
        if (process.env.SMTP_USER && process.env.SMTP_USER.includes('@')) {
            // mailOptions.to = process.env.SMTP_USER; // Send to self?
            // Or maybe 'admin@mailcroc.qzz.io' as implied.
            mailOptions.to = 'admin@mailcroc.qzz.io';
        } else {
            mailOptions.to = 'admin@mailcroc.qzz.io';
        }

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error sending incident report:', error);
        return NextResponse.json(
            { error: 'Failed to send report' },
            { status: 500 }
        );
    }
}
