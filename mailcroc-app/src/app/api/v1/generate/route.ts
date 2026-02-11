
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse, rateLimitResponse } from '@/lib/apiAuth';

export const runtime = 'edge';

// Random names for email generation
const ADJECTIVES = ['happy', 'clever', 'brave', 'calm', 'swift', 'silent', 'eager', 'proud', 'wild', 'bold'];
const NOUNS = ['fox', 'wolf', 'bear', 'eagle', 'hawk', 'lion', 'tiger', 'shark', 'whale', 'panda'];

function generateRandomEmail(domain: string = 'mailcroc.qzz.io'): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 9999);
    return `${adj}-${noun}-${num}@${domain}`;
}

export async function POST(req: NextRequest) {
    // 1. Auth Check
    if (!validateApiKey(req)) {
        return unauthorizedResponse();
    }

    // 2. Parse Body
    let count = 1;
    let domain = 'mailcroc.qzz.io';

    try {
        const body = await req.json();
        if (body.count) count = Math.min(Math.max(1, Number(body.count)), 50); // Cap at 50
        if (body.domain === 'random') {
            // logic for random domain if we had multiple
        }
    } catch (e) {
        // ignore json parse error, use defaults
    }

    // 3. Generate Emails
    const emails = [];
    for (let i = 0; i < count; i++) {
        emails.push(generateRandomEmail(domain));
    }

    return NextResponse.json({
        success: true,
        count: emails.length,
        emails: emails,
        expires_in: '24h'
    });
}
