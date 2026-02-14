
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
    console.log('Token Scopes:', data.scope);
    return data.access_token;
}

async function testCreateAlias() {
    const token = await getGmailAccessToken();
    if (!token) return;

    const email = 'test.final@mailcroc.qzz.io';
    const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/settings/sendAs', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sendAsEmail: email,
            displayName: "Final Test",
            treatAsAlias: true
        }),
    });

    const result = await res.json();
    console.log('Result:', JSON.stringify(result, null, 2));
}

testCreateAlias();
