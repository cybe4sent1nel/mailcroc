import { NextRequest, NextResponse } from 'next/server';
import { getSecureMessage } from '@/lib/github-db';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const content = await getSecureMessage(id);
        if (!content) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

        return NextResponse.json({ content });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
