
const dns = require('dns');

const recipient = 'fahadkhanxyz8816@gmail.com';
const baseUrl = 'http://localhost:3000/api/emails/send';
const domain = 'mailcroc.qzz.io';

async function checkSPF() {
    return new Promise((resolve) => {
        console.log(`\n🔍 Checking SPF record for ${domain}...`);
        dns.resolveTxt(domain, (err, records) => {
            if (err) {
                console.error(`❌ DNS Lookup failed: ${err.message}`);
                resolve(false);
                return;
            }
            const spf = records.flat().find(r => r.includes('v=spf1'));
            if (spf) {
                console.log(`   Found SPF: "${spf}"`);
                if (spf.includes('relay.mailchannels.net')) {
                    console.log(`✅ SPF is correctly configured for MailChannels.`);
                    resolve(true);
                } else {
                    console.error(`❌ SPF MISSING MailChannels include!`);
                    console.error(`   ACTION REQUIRED: Add "include:relay.mailchannels.net" to your SPF record.`);
                    resolve(false);
                }
            } else {
                console.error(`❌ No SPF record found.`);
                resolve(false);
            }
        });
    });
}

async function testStealthRelay() {
    const spfOk = await checkSPF();

    console.log(`\n--- Testing Cloudflare Stealth Relay ---`);
    console.log(`Target: ${recipient}\n`);

    const payload = {
        action: 'compose',
        from: `stealth.ninja100@${domain}`, // Triggers Cloudflare Proxy
        to: recipient,
        subject: 'Cloudflare Stealth Relay Verification 🛡️🚀',
        body: 'This email is being sent through the Cloudflare Stealth Relay tunnel.\n\nResult expected: NO Gmail address in brackets!'
    };

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log('API Response Status:', response.status);
        console.log('API Response Body:', JSON.stringify(data, null, 2));

        if (response.ok && data.success) {
            console.log('\n✅ TRANSMISSION SUCCESSFUL!');
            console.log(`Verification: ${data.message}`);
            console.log('Privacy Status:', data.privacy);
        } else {
            console.error('\n❌ TRANSMISSION FAILED:', data.error || 'Unknown error');
            if (data.debug?.cfError?.includes('401')) {
                console.log('\n💡 TIP: 401 Error usually means MailChannels rejected the sender due to missing SPF.');
            }
        }
    } catch (err) {
        console.error('\n❌ CONNECTION ERROR:', err.message);
    }
}

testStealthRelay();
