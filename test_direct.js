
const nodemailer = require('nodemailer');

async function testDirectSend() {
    console.log('Testing DIRECT MX delivery (The "Invention")...');

    // Direct transport sends directly to the recipient's mail server
    const transporter = nodemailer.createTransport({
        direct: true,
        host: 'aspmx.l.google.com', // Manual MX discovery for gmail.com
        port: 25,
    });

    try {
        const info = await transporter.sendMail({
            from: '"Direct Stealth" <stealth.direct@mailcroc.qzz.io>',
            to: 'fahadkhanxyz8816@gmail.com',
            subject: 'Direct MX Test (No Brackets?)',
            text: 'If this arrives, it should have NO brackets and NO primary email disclosed.',
        });
        console.log('Message sent:', info.messageId);
    } catch (err) {
        console.error('Direct send failed (Probably blocked by ISP/Firewall):', err.message);
    }
}

testDirectSend();
