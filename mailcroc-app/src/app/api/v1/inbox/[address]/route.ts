
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/apiAuth';
import { getEmailsByAddress, deleteInbox } from '@/lib/github-db';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
    if (!validateApiKey(req)) return unauthorizedResponse();

    const { address } = await params;
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

    try {
        const emails = await getEmailsByAddress(address);
        return NextResponse.json({
            success: true,
            count: emails.length,
            data: emails
        });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
    if (!validateApiKey(req)) return unauthorizedResponse();

    const { address } = await params;
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

    try {
        await deleteInbox(address);
        return NextResponse.json({ success: true, message: 'Inbox cleared' });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to clear inbox' }, { status: 500 });
    }
}
