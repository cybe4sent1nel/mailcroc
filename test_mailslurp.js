
const apiKey = 'sk_luw21dFgoeiQkqH0_1b7m080swAIO6rk2E9zWvQPin34PYg7WDJTlOnSIOQJH879iAHT3EJl4KOcNUuHI';

async function testMailSlurp() {
    console.log('Testing MailSlurp API...');
    try {
        const res = await fetch('https://api.mailslurp.com/inboxes?size=1', {
            headers: { 'x-api-key': apiKey }
        });
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

testMailSlurp();
