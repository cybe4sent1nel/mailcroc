
const workerUrl = 'https://mailcroc-stealth-relay.fahadkhanxyz8816.workers.dev';
const secret = 'mailcroc-wh-s3cret-2024';

async function debugWorker() {
    const payload = {
        from: 'test@mailcroc.qzz.io',
        to: 'fahadkhanxyz8816@gmail.com',
        subject: 'Worker Direct Debug',
        body: 'Debug message'
    };

    console.log('Sending to worker...');
    const res = await fetch(workerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-mc-secret': secret,
            'User-Agent': 'MailCroc-Server/1.0'
        },
        body: JSON.stringify(payload)
    });

    console.log('Status:', res.status);
    const text = await res.text();
    try {
        console.log('Body:', JSON.stringify(JSON.parse(text), null, 2));
    } catch {
        console.log('Body:', text);
    }
}

debugWorker();
