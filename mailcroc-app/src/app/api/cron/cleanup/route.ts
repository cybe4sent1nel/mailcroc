import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

/**
 * Archive old emails from repo to GitHub Releases
 * 1. Fetch file list
 * 2. Filter old files
 * 3. Create Release
 * 4. Upload Assets (Bundled JSONs)
 * 5. Delete from Repo
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;

    if (!token || !owner || !repo) {
        return NextResponse.json({ error: 'GitHub config missing' }, { status: 500 });
    }

    const octokit = new Octokit({ auth: token });

    try {
        // 1. Get all emails
        const { data: contents } = await octokit.repos.getContent({
            owner,
            repo,
            path: 'emails',
            recursive: true
        }) as any;

        const emailFiles = (contents as any[]).filter(f => f.type === 'file' && f.name.endsWith('.json'));

        // Simple heuristic: Archive files older than 24 hours
        // We can't easily get 'created_at' from list, but we can assume if they exist and we are cleaning, 
        // we might just archive everything periodically or check names (which start with timestamp).

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const toArchive = emailFiles.filter(f => {
            const timestamp = parseInt(f.name.split('-')[0]);
            return !isNaN(timestamp) && (now - timestamp) > oneDay;
        });

        if (toArchive.length === 0) {
            return NextResponse.json({ message: 'No emails to archive' });
        }

        // 2. Create Release
        const tagName = `archive-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
        const release = await octokit.repos.createRelease({
            owner,
            repo,
            tag_name: tagName,
            name: `Email Archive ${new Date().toLocaleDateString()}`,
            body: `Archived ${toArchive.length} emails to keep the production repo clean.`,
            draft: false,
            prerelease: false
        });

        // 3. For demo/simplicity, we'll just upload a single manifest or a few 
        // In a real high-volume scenario, you'd ZIP them.
        const manifest = {
            archivedAt: new Date().toISOString(),
            emails: [] as any[]
        };

        for (const file of toArchive) {
            const { data: fileData } = await octokit.repos.getContent({
                owner,
                repo,
                path: file.path
            }) as any;

            const content = Buffer.from(fileData.content, 'base64').toString();
            manifest.emails.push(JSON.parse(content));
        }

        const assetContent = Buffer.from(JSON.stringify(manifest, null, 2));

        await octokit.repos.uploadReleaseAsset({
            owner,
            repo,
            release_id: release.data.id,
            name: `emails-archive-${Date.now()}.json`,
            data: assetContent as any,
            headers: {
                'content-type': 'application/json',
                'content-length': assetContent.length
            }
        });

        // 4. Delete archived files from repo
        for (const file of toArchive) {
            await octokit.repos.deleteFile({
                owner,
                repo,
                path: file.path,
                message: `🗑️ Archiving to Release ${tagName}`,
                sha: file.sha
            });
        }

        return NextResponse.json({
            success: true,
            archivedCount: toArchive.length,
            release: release.data.html_url
        });

    } catch (error: any) {
        console.error('Archive Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
