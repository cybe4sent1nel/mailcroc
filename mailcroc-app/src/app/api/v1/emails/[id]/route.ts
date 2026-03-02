
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/apiAuth';
import { findEmailById } from '@/lib/github-db';

// Standard Node.js runtime preferred to avoid Edge region outages (dxb1)
// export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!validateApiKey(req)) return unauthorizedResponse();

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const result = await findEmailById(id);
        if (!result) {
            return NextResponse.json({ error: 'Email not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: result.email
        });
    } catch (err) {
        return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 });
    }
}
