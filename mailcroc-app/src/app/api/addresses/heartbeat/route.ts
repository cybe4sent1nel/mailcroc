import { NextRequest, NextResponse } from 'next/server';
import { claimAddress } from '@/lib/github-db';

export async function POST(req: NextRequest) {
    try {
        const { address, sessionId } = await req.json();

        if (!address || !sessionId) {
            return NextResponse.json({ error: 'Missing address or sessionId' }, { status: 400 });
        }

        // Claiming performs an update on lastActive if already owned
        const result = await claimAddress(address, sessionId);

        return NextResponse.json({ success: result.success });
    } catch (err: unknown) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
