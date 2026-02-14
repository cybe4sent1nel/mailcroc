
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        CLOUDFLARE_WORKER_URL: process.env.CLOUDFLARE_WORKER_URL || 'MISSING',
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET ? 'SET' : 'MISSING',
        MAILSLURP_API_KEY: process.env.MAILSLURP_API_KEY ? 'SET' : 'MISSING',
        SMTP_USER: process.env.SMTP_USER || 'MISSING'
    });
}
