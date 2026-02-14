
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'mailcroc-app/.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
});

async function getGmailAccessToken() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
    console.log('ClientID:', GMAIL_CLIENT_ID ? 'OK' : 'MISSING');
    console.log('Secret:', GMAIL_CLIENT_SECRET ? 'OK' : 'MISSING');
    console.log('Token:', GMAIL_REFRESH_TOKEN ? 'OK' : 'MISSING');

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GMAIL_CLIENT_ID,
            client_secret: GMAIL_CLIENT_SECRET,
            refresh_token: GMAIL_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        }),
    });

    const data = await response.json();
    if (!data.access_token) {
        console.error('Failed to get token:', data);
        return null;
    }
    return data.access_token;
}

async function testSend() {
    const token = await getGmailAccessToken();
    if (!token) return;
    console.log('Token acquired!', token.substring(0, 10) + '...');

    const from = 'stealth-test@mailcroc.qzz.io'; // Using an alias to test masking
    const to = 'fahadkhanxyz8816@gmail.com';
    const subject = 'Gmail API Test';
    const body = 'Testing raw Gmail API with Refresh Token.';

    const message = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
    ].join('\r\n');

    const raw = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw })
    });

    const result = await res.json();
    console.log('Result:', JSON.stringify(result, null, 2));
}

testSend();
