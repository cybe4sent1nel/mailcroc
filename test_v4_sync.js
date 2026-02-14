
const recipient = 'fahadkhanxyz8816@gmail.com';
const baseUrl = 'http://localhost:3000/api/emails/send';
const domain = 'mailcroc.qzz.io';
const randomId = Math.floor(Math.random() * 10000);
const from = `stealth.v4.${randomId}@${domain}`;

async function testV4Sync() {
    console.log(`\n🚀 Testing V4 SYNC-STEALTH for: ${from}`);
    console.log(`Target: ${recipient}\n`);

    const payload = {
        action: 'compose',
        from: from,
        to: recipient,
        subject: `Sync-Stealth Test V4 #${randomId} 🥒🎭`,
        body: `<h1>Perfect Privacy V4!</h1><p>This email was sent via the <b>Direct SMTP + Gmail Sync</b> workaround.</p><p>Check your primary Gmail account's <b>SENT</b> folder. You should see this message there, and the recipient should see NO brackets!</p>`
    };

    console.log('Sending request...');

    try {
        const startTime = Date.now();
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\nAPI Response (${duration}s):`);
        console.log(JSON.stringify(data, null, 2));

        if (response.ok && data.success) {
            console.log('\n✅ V4 TEST PASSED!');
            console.log('Now check your primary Gmail "Sent" folder!');
        } else {
            console.error('\n❌ V4 TEST FAILED:', data.error || 'Unknown error');
        }
    } catch (err) {
        console.error('\n❌ CONNECTION ERROR:', err.message);
    }
}

testV4Sync();
