import { NextRequest, NextResponse } from 'next/server';
import { getIdentityForAddress, saveIdentity } from '@/lib/github-db';

export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get('address');
    if (!address) return NextResponse.json({ error: 'Address required' }, { status: 400 });

    const identity = await getIdentityForAddress(address);
    return NextResponse.json({ identity });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { address, type, smtpOptions } = body;

        if (!address || !type) {
            return NextResponse.json({ error: 'Address and type required' }, { status: 400 });
        }

        // Handle Gmail Ghosting
        if (type === 'gmail_alias') {
            try {
                const { getGmailAccessToken, ensureGmailAlias } = await import('@/lib/gmail');
                const accessToken = await getGmailAccessToken();

                // Start the alias creation and verification process
                const result = await ensureGmailAlias(address, accessToken);

                if (result === false) {
                    // Personal Gmail account limitation
                    return NextResponse.json({
                        error: 'Gmail Ghosting requires a Google Workspace account. Personal Gmail accounts cannot create aliases programmatically. Please use "Connect Own SMTP" instead.'
                    }, { status: 403 });
                }

                // Save the identity
                await saveIdentity({
                    address,
                    type: 'gmail_alias',
                    verificationStatus: 'verified'
                });

                return NextResponse.json({ success: true, message: 'Gmail alias created and verified!' });
            } catch (err: any) {
                console.error('[Gmail Ghosting] Error:', err);
                return NextResponse.json({
                    error: err.message || 'Failed to create Gmail alias'
                }, { status: 500 });
            }
        }

        // Handle External SMTP
        const success = await saveIdentity({
            address,
            type,
            smtpOptions,
            verificationStatus: type === 'external_smtp' ? 'verified' : 'pending'
        });

        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: 'Failed to save identity' }, { status: 500 });
        }
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
