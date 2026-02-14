
const recipient = 'fahadkhanxyz8816@gmail.com';
const baseUrl = 'http://localhost:3000/api/emails/send';
const domain = 'mailcroc.qzz.io';
const randomId = Math.floor(Math.random() * 10000);
const from = `stealth.test.v3.${randomId}@${domain}`;

async function testAutomatedSend() {
    console.log(`\n🚀 Testing FULL AUTOMATION for: ${from}`);
    console.log(`Target: ${recipient}\n`);

    const payload = {
        action: 'compose',
        from: from,
        to: recipient,
        subject: `Total Privacy Test V3 #${randomId} 🥒🎭`,
        body: `<h1>Success V3!</h1><p>This email was sent via the <b>Automated Gmail API Proxy</b>.</p><p>If you see NO brackets and NO primary Gmail address, the handshake was successful!</p>`
    };

    console.log('Sending request to API route...');
    console.log('(This will take ~15 seconds to finish the background handshake)...');

    try {
        const startTime = Date.now();
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\nAPI Response (${duration}s): Status`, response.status);
        console.log('Body:', JSON.stringify(data, null, 2));

        if (response.ok && (data.success || data.message?.includes('Gmail API'))) {
            console.log('\n✅ TEST PASSED!');
            console.log(`Message: ${data.message}`);
        } else {
            console.error('\n❌ TEST FAILED:', data.error || 'Unknown error');
        }
    } catch (err) {
        console.error('\n❌ CONNECTION ERROR:', err.message);
    }
}

testAutomatedSend();
