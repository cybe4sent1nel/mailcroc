
const workerUrl = 'https://mailcroc-stealth-relay.fahadkhanxyz8816.workers.dev';
const secret = 'mailcroc-wh-s3cret-2024';

async function testFetch() {
    console.log('Testing Cloudflare Relay with node fetch...');
    try {
        const res = await fetch(workerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-mc-secret': secret
            },
            body: JSON.stringify({
                from: 'stealth@mailcroc.qzz.io',
                to: 'fahadkhanxyz8816@gmail.com',
                subject: 'Node Fetch Test',
                body: 'Test'
            })
        });

        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Full Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testFetch();
