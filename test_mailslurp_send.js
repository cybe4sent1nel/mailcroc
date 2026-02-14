
const { MailSlurp } = require('mailslurp-client');

const apiKey = 'sk_luw21dFgoeiQkqH0_1b7m080swAIO6rk2E9zWvQPin34PYg7WDJTlOnSIOQJH879iAHT3EJl4KOcNUuHI';
const recipient = 'fahadkhanxyz8816@gmail.com';

async function testSend() {
    console.log('Testing MailSlurp Send...');
    const mailslurp = new MailSlurp({ apiKey });

    try {
        const inbox = await mailslurp.createInbox();
        console.log('Inbox created:', inbox.id, inbox.emailAddress);

        console.log('Sending email...');
        await mailslurp.sendEmail(inbox.id, {
            to: [recipient],
            subject: 'MailSlurp Privacy Test',
            body: 'Checking if Gmail address is hidden.'
        });
        console.log('✅ Send successful!');
    } catch (err) {
        console.error('Send Error:', err.message);
        if (err.body) console.log('Error Body:', err.body);
    }
}

testSend();
