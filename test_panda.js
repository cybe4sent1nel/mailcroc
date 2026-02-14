
const recipient = 'fahadkhanxyz8816@gmail.com';
const baseUrl = 'http://localhost:3000/api/emails/send';
const randomId = Math.floor(Math.random() * 10000);
const from = `panda.stealth.${randomId}@mailpanda.qzz.io`;

async function testPandaStealth() {
    console.log(`\n🐼 Testing PANDA-STEALTH for: ${from}`);
    console.log(`Target: ${recipient}\n`);

    const payload = {
        action: 'compose',
        from: from,
        to: recipient,
        subject: `Panda Privacy Test #${randomId} 🐼🛡️`,
        body: `<h1>Panda Power!</h1><p>Testing the master relay for MailPanda domain.</p>`
    };

    console.log('Sending request...');

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`\nAPI Response:`);
        console.log(JSON.stringify(data, null, 2));

        if (response.ok && data.success) {
            console.log('\n✅ PANDA TEST SENT!');
        } else {
            console.error('\n❌ PANDA TEST FAILED (Expected if relay not verified yet):', data.error || 'Unknown error');
        }
    } catch (err) {
        console.error('\n❌ CONNECTION ERROR:', err.message);
    }
}

testPandaStealth();
