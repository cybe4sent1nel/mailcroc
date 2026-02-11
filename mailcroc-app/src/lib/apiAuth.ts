
import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the API key from the request headers.
 * Looks for 'x-api-key' header.
 * 
 * For now, we use a simple hardcoded key or environment variable.
 * In production, you'd check a database of keys.
 */
export function validateApiKey(req: NextRequest): boolean {
    const apiKey = req.headers.get('x-api-key');
    const validKeys = (process.env.API_KEYS || 'mailcroc-dev-key').split(',');

    if (!apiKey || !validKeys.includes(apiKey)) {
        return false;
    }
    return true;
}

export function unauthorizedResponse() {
    return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing x-api-key header' },
        { status: 401 }
    );
}

export function rateLimitResponse() {
    return NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded' },
        { status: 429 }
    );
}
