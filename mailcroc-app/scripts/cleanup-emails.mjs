/**
 * Email Cleanup Script
 * Deletes emails older than 24 hours from the GitHub repository.
 * Respects 'pinned' status.
 */

// Native fetch is available in Node 18+

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_REPO_OWNER;
const REPO = process.env.GITHUB_REPO_NAME;
const GITHUB_API = 'https://api.github.com';

if (!TOKEN || !OWNER || !REPO) {
    console.error('Missing environment variables');
    process.exit(1);
}

const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
};

async function run() {
    console.log('Starting cleanup...');
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

    try {
        // 1. List all address folders
        const res = await fetch(`${GITHUB_API}/repos/${OWNER}/${REPO}/contents/emails`, { headers });
        if (!res.ok) {
            console.log('No emails folder found or API error.');
            return;
        }

        const folders = await res.json();
        if (!Array.isArray(folders)) return;

        for (const folder of folders) {
            if (folder.type !== 'dir') continue;

            console.log(`Checking folder: ${folder.path}`);
            const folderRes = await fetch(folder.url, { headers });
            if (!folderRes.ok) continue;

            const files = await folderRes.json();
            if (!Array.isArray(files)) continue;

            for (const file of files) {
                if (!file.name.endsWith('.json')) continue;

                // Preliminary check by timestamp in filename
                const timestamp = parseInt(file.name.split('-')[0]);
                if (isNaN(timestamp) || timestamp > twentyFourHoursAgo) continue;

                // Candidate for deletion — read to check 'pinned' status
                const fileRes = await fetch(file.url, { headers });
                if (!fileRes.ok) continue;

                const fileData = await fileRes.json();
                const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                let email;
                try {
                    email = JSON.parse(content);
                } catch (e) {
                    console.error(`Failed to parse ${file.path}, possibly corrupt.`);
                    continue;
                }

                if (email.pinned) {
                    console.log(`Skipping pinned email: ${file.path}`);
                    continue;
                }

                // Delete it
                console.log(`Deleting expired email: ${file.path}`);
                const delRes = await fetch(file.url, {
                    method: 'DELETE',
                    headers,
                    body: JSON.stringify({
                        message: '🗑️ Automated 24h cleanup',
                        sha: fileData.sha
                    })
                });

                if (delRes.ok) {
                    console.log(`Successfully deleted ${file.path}`);
                } else {
                    console.error(`Failed to delete ${file.path}: ${delRes.status}`);
                }

                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 200));
            }
        }

        console.log('Cleanup finished.');
    } catch (err) {
        console.error('Cleanup failed:', err);
    }
}

run();
