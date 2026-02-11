import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse, rateLimitResponse } from '@/lib/apiAuth';
import { generateEmailAddress, GenerationMode } from '@/lib/domains';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    // 1. Auth Check
    if (!validateApiKey(req)) {
        return unauthorizedResponse();
    }

    // 2. Parse Body
    let count = 1;
    let mode: GenerationMode = 'standard';

    try {
        const body = await req.json();
        if (body.count) count = Math.min(Math.max(1, Number(body.count)), 50); // Cap at 50
        // Map domain param to mode if possible, or just use mode param
        if (body.mode) mode = body.mode as GenerationMode;
    } catch (e) {
        // ignore json parse error, use defaults
    }

    // 3. Generate Emails
    const emails = [];
    for (let i = 0; i < count; i++) {
        emails.push(generateEmailAddress(mode));
    }

    return NextResponse.json({
        success: true,
        count: emails.length,
        emails: emails,
        expires_in: '24h'
    });
}
