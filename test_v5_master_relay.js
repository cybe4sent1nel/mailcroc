
const recipient = 'fahadkhanxyz8816@gmail.com';
const baseUrl = 'http://localhost:3000/api/emails/send';
const domain = 'mailcroc.qzz.io';
const randomId = Math.floor(Math.random() * 10000);
const from = `stealth.v5.${randomId}@${domain}`;

async function testV5MasterRelay() {
    console.log(`\n🚀 Testing V5 MASTER-RELAY for: ${from}`);
    console.log(`Target: ${recipient}\n`);

    const payload = {
        action: 'compose',
        from: from,
        to: recipient,
        subject: `Zero-Disclosure Test V5 #${randomId} 🥒🎭`,
        body: `<h1>Success V5!</h1><p>This email was sent via the <b>Master Relay Masking</b> strategy.</p><p>If you see NO brackets and NO primary Gmail address, the envelope masking worked!</p>`
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
            console.log('\n✅ V5 TEST PASSED!');
            console.log('Now check your recipient inbox for brackets!');
        } else {
            console.error('\n❌ V5 TEST FAILED:', data.error || 'Unknown error');
        }
    } catch (err) {
        console.error('\n❌ CONNECTION ERROR:', err.message);
    }
}

testV5MasterRelay();
