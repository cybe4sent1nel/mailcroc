import { NextRequest, NextResponse } from 'next/server';
import { getEmailsByAddress, updateEmail, updateEmailsByAddress, findEmailById } from '@/lib/github-db';

/**
 * GET /api/emails?address=user@example.com
 * Fetch all emails for an address from GitHub repo
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    try {
        const emails = await getEmailsByAddress(address);
        return NextResponse.json(emails);
    } catch (e) {
        console.error('GET emails error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/emails
 * Pin/unpin emails or update expiry
 */
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { emailId, action, value, address } = body;

        if (action === 'pin' && emailId) {
            // Need to find the email first to get its address
            const found = await findEmailById(emailId);
            if (!found) {
                return NextResponse.json({ error: 'Email not found' }, { status: 404 });
            }
            const success = await updateEmail(emailId, found.address, { pinned: value ?? true });
            return NextResponse.json({ success });
        }

        if (action === 'read' && emailId) {
            const found = await findEmailById(emailId);
            if (!found) return NextResponse.json({ error: 'Email not found' }, { status: 404 });
            const success = await updateEmail(emailId, found.address, { read: value ?? true });
            return NextResponse.json({ success });
        }

        if (action === 'expiry' && address) {
            const expiresAt = value ? new Date(Date.now() + value * 60 * 1000).toISOString() : null;
            const success = await updateEmailsByAddress(address, { expiresAt });
            return NextResponse.json({ success });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (e) {
        console.error('PATCH emails error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/emails
 * Delete an email
 */
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { emailId, address } = body;

        if (!emailId || !address) {
            return NextResponse.json({ error: 'Missing emailId or address' }, { status: 400 });
        }

        const success = await import('@/lib/github-db').then(m => m.deleteEmail(emailId, address));
        return NextResponse.json({ success });
    } catch (e) {
        console.error('DELETE emails error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
