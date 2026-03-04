const fs = require('fs');

async function main() {
    const res = await fetch('http://localhost:3000/api/emails?address=testing123@mailcroc.qzz.io', {
        headers: {
            'x-api-key': 'public_beta_key_v1'
        }
    });
    const data = await res.json();
    console.log(`Found ${data.length} emails`);
    if (data.length > 0) {
        data.forEach(e => {
            console.log(`Email from ${e.from}, subject ${e.subject}`);
            console.log(`Attachments array length: ${e.attachments ? e.attachments.length : 0}`);
            if (e.attachments && e.attachments.length > 0) {
                e.attachments.forEach(a => {
                    console.log(` - name: ${a.name}, type: ${a.type}, size: ${a.size}, content length: ${a.content ? a.content.length : 0}`);
                });
            }
        });
    }
}
main();
