import { getEmailsByAddress } from './src/lib/github-db';

async function main() {
    const emails = await getEmailsByAddress('testing123@mailcroc.qzz.io');
    for (const e of emails) {
        console.log(`Email from ${e.from}: ${e.attachments?.length} attachments`);
        if (e.attachments?.length > 0) {
            console.log(e.attachments.map(a => ({ name: a.name, type: a.type, size: a.size, hasContent: !!a.content })));
        }
    }
}
main();
