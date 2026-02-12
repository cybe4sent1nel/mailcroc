const fs = require('fs');
const path = require('path');
const https = require('https');

// 1. Load Environment Variables manually
console.log("Loading .env.local...");
const envPath = path.join(__dirname, '.env.local');
let env = {};
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key && !key.startsWith('#')) env[key] = value;
        }
    });
} catch (err) {
    console.error("Failed to read .env.local");
    process.exit(1);
}

const API_KEY = env.ELEVENLABS_API_KEY;
const VOICE_ID = env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

if (!API_KEY) {
    console.error("❌ ELEVENLABS_API_KEY is missing in .env.local");
    process.exit(1);
}

console.log(`✅ Found API Key: ${API_KEY.slice(0, 5)}...`);
console.log(`✅ Using Voice ID: ${VOICE_ID}`);

// 2. Prepare Request
const textToSpeech = "Hello! This is a test of the MailCroc voice generation system. If you can hear this, the system is working flawlessly.";
console.log(`\nTesting generation for text: "${textToSpeech}"`);

const options = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${VOICE_ID}`,
    method: 'POST',
    headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
    }
};

const genders = ['female', 'male'];

(async () => {
    for (const gender of genders) {
        console.log(`\n🔊 Testing Gender: ${gender.toUpperCase()}`);

        await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                console.log(`Response Status: ${res.statusCode}`);
                if (res.statusCode !== 200) {
                    console.error(`❌ API Request Failed!`);
                    res.on('data', d => console.error(d.toString()));
                    resolve(); // Continue
                    return;
                }

                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    console.log(`✅ Received Audio Data: ${buffer.length} bytes`);
                    fs.writeFileSync(`test-voice-${gender}.mp3`, buffer);
                    console.log(`✅ Saved audio to test-voice-${gender}.mp3`);
                    resolve();
                });
            });

            req.on('error', (e) => {
                console.error(`❌ Request Error: ${e.message}`);
                resolve();
            });

            req.write(JSON.stringify({
                text: textToSpeech,
                gender: gender, // Pass gender
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            }));
            req.end();
        });
    }
    console.log(`\n🎉 Verification Completed!`);
})();
