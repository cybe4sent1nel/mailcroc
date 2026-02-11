
import { NextRequest, NextResponse } from 'next/server';
import { saveApiKey, getDeveloperKeys, saveDeveloperKeys, revokeApiKeyFile, ApiKeyMeta } from '@/lib/github-db';
import crypto from 'crypto';

/**
 * Helper: Hash API Key
 */
function hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * GET /api/developers/keys?ownerId=...
 * List all keys for a developer
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('ownerId');

    if (!ownerId) {
        return NextResponse.json({ error: 'Owner ID required' }, { status: 400 });
    }

    try {
        const keys = await getDeveloperKeys(ownerId);
        // Don't return full details if sensitive, but here we just store metadata in developer list
        return NextResponse.json(keys);
    } catch (e) {
        console.error('GET keys error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/developers/keys
 * Create a new API key
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, name } = body;

        console.log('Creating key for:', ownerId, name);

        if (!ownerId || !name) {
            return NextResponse.json({ error: 'Owner ID and Name required' }, { status: 400 });
        }

        // Generate Key
        const randomPart = crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
        const apiKey = `mailcroc_${randomPart}`;
        const keyHash = hashKey(apiKey);
        const keyPrefix = `mailcroc_${randomPart.substring(0, 4)}...`;

        const newKey: ApiKeyMeta = {
            id: crypto.randomUUID(),
            hash: keyHash,
            ownerId,
            name,
            prefix: keyPrefix,
            createdAt: new Date().toISOString(),
            revoked: false
        };

        // Save to api_keys/{hash}.json (This is the source of truth for validation)
        const saved = await saveApiKey(keyHash, newKey);
        if (!saved) throw new Error('Failed to save API key file');

        // Update developer's list
        const existingKeys = await getDeveloperKeys(ownerId);
        const updatedKeys = [...existingKeys, newKey];
        await saveDeveloperKeys(ownerId, updatedKeys);

        // Return the FULL key only once
        return NextResponse.json({
            success: true,
            apiKey: apiKey, // The secret key
            keyMeta: newKey
        });

    } catch (e) {
        console.error('POST keys error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/developers/keys
 * Revoke an API key
 */
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { ownerId, keyId } = body;

        if (!ownerId || !keyId) {
            return NextResponse.json({ error: 'Owner ID and Key ID required' }, { status: 400 });
        }

        const keys = await getDeveloperKeys(ownerId);
        const keyToRevoke = keys.find(k => k.id === keyId);

        if (!keyToRevoke) {
            return NextResponse.json({ error: 'Key not found' }, { status: 404 });
        }

        // 1. Remove from valid api_keys folder (so it stops working)
        if (!keyToRevoke.revoked) {
            await revokeApiKeyFile(keyToRevoke.hash);
        }

        // 2. Update developer list to mark as revoked (or remove)
        // Let's mark as revoked so they see history
        const updatedKeys = keys.map(k => k.id === keyId ? { ...k, revoked: true } : k);
        const saved = await saveDeveloperKeys(ownerId, updatedKeys);

        return NextResponse.json({ success: saved });

    } catch (e) {
        console.error('DELETE keys error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
