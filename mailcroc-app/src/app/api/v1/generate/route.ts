import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse, rateLimitResponse } from '@/lib/apiAuth';
import { generateEmailAddress, GenerationConfig } from '@/lib/domains';

// Switched to Node runtime for stability with background tasks

export async function POST(req: NextRequest) {
    // 1. Auth Check
    if (!validateApiKey(req)) {
        return unauthorizedResponse();
    }

    // 2. Parse Body
    let count = 1;
    let config: GenerationConfig = { standard: true };

    try {
        const body = await req.json();
        if (body.count) count = Math.min(Math.max(1, Number(body.count)), 50); // Cap at 50

        // Handle additive config or old-style mode string
        if (body.config) {
            config = body.config;
        } else if (body.mode) {
            // Backward compatibility for old "mode" strings
            const mode = body.mode as string;
            config = {
                standard: mode === 'standard',
                plus: mode === 'plus',
                dot: mode === 'dot',
                gmail: mode === 'gmail',
                googlemail: mode === 'googlemail'
            };
        }
    } catch (e) {
        // ignore json parse error, use defaults
    }

    // 3. Generate Emails
    const emails = [];
    for (let i = 0; i < count; i++) {
        emails.push(generateEmailAddress(config));
    }

    // 4. Automated Gmail Alias Setup
    // If we're generating custom domain addresses, start the handshake immediately
    try {
        const isCustomDomain = (addr: string) => addr.endsWith('@mailcroc.qzz.io') || addr.endsWith('@mailpanda.qzz.io');
        const customEmails = emails.filter(isCustomDomain);

        if (customEmails.length > 0) {
            const { getGmailAccessToken, ensureGmailAlias } = await import('@/lib/gmail');
            const accessToken = await getGmailAccessToken();

            // We only do this for the first few to avoid hitting Google API limits
            // and keeping the generate request fast.
            for (const email of customEmails.slice(0, 5)) {
                ensureGmailAlias(email, accessToken).catch(err => {
                    console.error(`[Gmail Auto-Alias] Background handshake failed for ${email}:`, err);
                });
            }
        }
    } catch (gErr) {
        console.warn("[Gmail Auto-Alias] Skipping auto-alias setup (API not ready/configured)");
    }

    return NextResponse.json({
        success: true,
        count: emails.length,
        emails: emails,
        expires_in: '24h'
    });
}
