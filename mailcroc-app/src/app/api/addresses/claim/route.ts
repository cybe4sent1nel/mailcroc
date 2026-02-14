import { NextResponse } from 'next/server';
import { claimAddress } from '@/lib/github-db';

export async function POST(req: Request) {
    try {
        const { address, sessionId } = await req.json();

        if (!address || !sessionId) {
            return NextResponse.json({ error: 'Missing address or sessionId' }, { status: 400 });
        }

        const result = await claimAddress(address, sessionId);

        if (!result.success) {
            return NextResponse.json({ error: result.message || 'Failed to claim address' }, { status: 409 });
        }

        // --- AUTOMATED GMAIL ALIAS SETUP ---
        // As soon as a user claims an address, we add it to the Gmail 'Send mail as' list
        // so they can send emails without brackets immediately.
        try {
            const { getGmailAccessToken, ensureGmailAlias } = await import('@/lib/gmail');
            const accessToken = await getGmailAccessToken();

            // We fire and forget this to keep the API responsive, 
            // but log the attempt.
            ensureGmailAlias(address, accessToken).catch(err => {
                console.error(`[Gmail Auto-Alias] Logic failed for ${address}:`, err);
            });
            console.log(`[Gmail Auto-Alias] Background handshake started for: ${address}`);
        } catch (gErr) {
            console.warn("[Gmail Auto-Alias] Gmail API not configured or failed to init:", gErr);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Claim API error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
