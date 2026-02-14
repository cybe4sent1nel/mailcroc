/**
 * GitHub Repo Database
 * 
 * Uses a private GitHub repo to store emails as JSON files.
 * Structure: emails/{encoded-address}/{id}.json
 * 
 * Env vars:
 *   GITHUB_TOKEN  — Personal access token (repo scope)
 *   GITHUB_OWNER  — GitHub username
 *   GITHUB_REPO   — Private repo name
 */

import { IEmail } from './models';

const GITHUB_API = 'https://api.github.com';

function getConfig() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;
    if (!token || !owner || !repo) {
        throw new Error('Missing GITHUB_TOKEN, GITHUB_REPO_OWNER, or GITHUB_REPO_NAME env vars');
    }
    return { token, owner, repo };
}

function headers() {
    const { token } = getConfig();
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
    };
}

function repoUrl(path: string) {
    const { owner, repo } = getConfig();
    return `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
}

/**
 * Encode an email address to a safe folder name
 */
function encodeAddress(address: string): string {
    return Buffer.from(address.toLowerCase().trim()).toString('base64url');
}

/**
 * Generate a unique ID for an email
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================
//  CRUD Operations
// ============================================

/**
 * Save a new email to the GitHub repo
 */
export async function saveEmail(email: Omit<IEmail, 'receivedAt' | 'pinned'> & { receivedAt?: Date; pinned?: boolean }, storageOwner?: string): Promise<IEmail & { _id: string }> {
    const id = generateId();
    // specific owner (e.g. sender for Sent box) or default to recipient
    const ownerAddress = storageOwner || (Array.isArray(email.to) ? email.to[0] : email.to);
    const folder = encodeAddress(ownerAddress || 'unknown');
    const path = `emails/${folder}/${id}.json`;

    // --- Isolation Logic ---
    const currentOwner = await getAddressOwner(ownerAddress || 'unknown');

    const emailData = {
        _id: id,
        from: email.from || 'unknown',
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject || '(No Subject)',
        text: email.text || '',
        html: email.html || '',
        messageId: email.messageId || '',
        receivedAt: email.receivedAt || new Date().toISOString(),
        pinned: email.pinned ?? false,
        expiresAt: email.expiresAt || null,
        folder: email.folder || 'inbox',
        category: email.category || 'primary',
        isThreat: email.isThreat || false,
        summary: email.summary || '',
        ownerSessionId: currentOwner?.sessionId || null,
    };

    const content = Buffer.from(JSON.stringify(emailData, null, 2)).toString('base64');

    const res = await fetch(repoUrl(path), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
            message: `📧 New email from ${email.from}`,
            content,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('GitHub save error:', err);
        throw new Error(`Failed to save email: ${res.status}`);
    }

    return emailData as IEmail & { _id: string };
}

/**
 * Get all emails for an address (with optional session isolation)
 */
export async function getEmailsByAddress(address: string, sessionId?: string): Promise<(IEmail & { _id: string })[]> {
    const folder = encodeAddress(address);
    const path = `emails/${folder}`;

    // List files in the folder
    const res = await fetch(repoUrl(path), {
        method: 'GET',
        headers: headers(),
    });

    if (res.status === 404) return []; // No emails yet
    if (!res.ok) {
        console.error('GitHub list error:', await res.text());
        return [];
    }

    const files = await res.json();
    if (!Array.isArray(files)) return [];

    // Fetch each email file
    const emails: (IEmail & { _id: string })[] = [];

    // Fetch in parallel (max 10 at a time)
    const batches = [];
    for (let i = 0; i < files.length; i += 10) {
        batches.push(files.slice(i, i + 10));
    }

    for (const batch of batches) {
        const results = await Promise.all(
            batch.map(async (file: any) => {
                try {
                    const fileRes = await fetch(file.url, {
                        headers: headers(),
                    });
                    if (!fileRes.ok) return null;

                    const fileData = await fileRes.json();
                    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                    const email = JSON.parse(content);

                    // Check expiry — skip expired non-pinned emails
                    if (email.expiresAt && !email.pinned) {
                        if (new Date(email.expiresAt) < new Date()) {
                            // Delete expired email in background
                            deleteFile(file.path, fileData.sha).catch(() => { });
                            return null;
                        }
                    }

                    return email;
                } catch {
                    return null;
                }
            })
        );
        const filteredResults = results.filter(Boolean).filter((email: any) => {
            if (!sessionId) return true; // No filter requested
            // If the email has an owner, it MUST match the requested session
            // If the email has NO owner, it's considered "legacy" or "system" and visible to all (or we could hide it)
            return !email.ownerSessionId || email.ownerSessionId === sessionId;
        });
        emails.push(...filteredResults);
    }

    // Sort by receivedAt descending
    emails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    return emails;
}

/**
 * Update an email (e.g., pin/unpin)
 */
export async function updateEmail(id: string, address: string, updates: Partial<IEmail>): Promise<boolean> {
    const folder = encodeAddress(address);
    const path = `emails/${folder}/${id}.json`;

    // First, get the current file (need sha for update)
    const getRes = await fetch(repoUrl(path), {
        headers: headers(),
    });

    if (!getRes.ok) {
        console.error('Email not found for update');
        return false;
    }

    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const email = JSON.parse(currentContent);

    // Apply updates
    const updated = { ...email, ...updates };
    const content = Buffer.from(JSON.stringify(updated, null, 2)).toString('base64');

    const res = await fetch(repoUrl(path), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
            message: `📌 Updated email ${id}`,
            content,
            sha: fileData.sha,
        }),
    });

    return res.ok;
}

/**
 * Update all emails for an address (e.g., set expiry)
 */
export async function updateEmailsByAddress(address: string, updates: Partial<IEmail>): Promise<boolean> {
    const emails = await getEmailsByAddress(address);

    const results = await Promise.all(
        emails.map(e => updateEmail(e._id, address, updates))
    );

    return results.every(Boolean);
}

/**
 * Find an email by ID across all address folders
 */
export async function findEmailById(id: string): Promise<{ email: IEmail & { _id: string }; address: string } | null> {
    // List all address folders
    const res = await fetch(repoUrl('emails'), {
        headers: headers(),
    });

    if (!res.ok) return null;
    const folders = await res.json();
    if (!Array.isArray(folders)) return null;

    for (const folder of folders) {
        const filePath = `${folder.path}/${id}.json`;
        const fileRes = await fetch(repoUrl(filePath), {
            headers: headers(),
        });
        if (fileRes.ok) {
            const fileData = await fileRes.json();
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            const email = JSON.parse(content);
            const address = Buffer.from(folder.name, 'base64url').toString('utf-8');
            return { email, address };
        }
    }
    return null;
}

/**
 * Delete a file from the repo
 */
/**
 * Delete a file from the repo
 */
export async function deleteEmail(id: string, address: string): Promise<boolean> {
    const folder = encodeAddress(address);
    const path = `emails/${folder}/${id}.json`;

    // Get sha first
    const getRes = await fetch(repoUrl(path), { headers: headers() });
    if (!getRes.ok) return false;
    const fileData = await getRes.json();

    const res = await fetch(repoUrl(path), {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({
            message: `🗑️ Deleted email ${id}`,
            sha: fileData.sha,
        }),
    });
    return res.ok;
}

async function deleteFile(path: string, sha: string): Promise<boolean> {
    const res = await fetch(repoUrl(path), {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({
            message: `🗑️ Deleted expired email`,
            sha,
        }),
    });
    return res.ok;
}

/**
 * Delete all emails for a specific address
 */
export async function deleteInbox(address: string): Promise<boolean> {
    const emails = await getEmailsByAddress(address);
    if (emails.length === 0) return true;

    // Delete in parallel
    const results = await Promise.all(
        emails.map(email => deleteEmail(email._id, address))
    );

    return results.every(Boolean);
}

// ============================================
//  API Key Management
// ============================================

export interface ApiKeyMeta {
    id: string;
    hash: string;
    ownerId: string;
    name: string;
    prefix: string;
    createdAt: string;
    revoked?: boolean;
}

/**
 * Save an API Key (Hashed)
 */
export async function saveApiKey(hash: string, meta: ApiKeyMeta): Promise<boolean> {
    const path = `api_keys/${hash}.json`;
    const content = Buffer.from(JSON.stringify(meta, null, 2)).toString('base64');

    const res = await fetch(repoUrl(path), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
            message: `🔑 New API Key ${meta.prefix}...`,
            content,
        }),
    });
    return res.ok;
}

/**
 * Get API Key Metadata by Hash
 */
export async function getApiKey(hash: string): Promise<ApiKeyMeta | null> {
    try {
        const path = `api_keys/${hash}.json`;
        const res = await fetch(repoUrl(path), { headers: headers() });
        if (!res.ok) return null;

        const fileData = await res.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return JSON.parse(content);
    } catch { return null; }
}

/**
 * Revoke API Key (Delete from valid keys)
 */
export async function revokeApiKeyFile(hash: string): Promise<boolean> {
    const path = `api_keys/${hash}.json`;
    // Get sha first
    const getRes = await fetch(repoUrl(path), { headers: headers() });
    if (!getRes.ok) return false;
    const fileData = await getRes.json();

    const res = await fetch(repoUrl(path), {
        method: 'DELETE',
        headers: headers(),
        body: JSON.stringify({
            message: `🗑️ Revoked API Key`,
            sha: fileData.sha,
        }),
    });
    return res.ok;
}

/**
 * Save Developer's Key List
 */
export async function saveDeveloperKeys(ownerId: string, keys: ApiKeyMeta[]): Promise<boolean> {
    const path = `developers/${ownerId}.json`;
    const content = Buffer.from(JSON.stringify(keys, null, 2)).toString('base64');

    // Check if exists to get sha
    const getRes = await fetch(repoUrl(path), { headers: headers() });
    let sha;
    if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
    }

    const res = await fetch(repoUrl(path), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
            message: `👤 Updated developer keys for ${ownerId}`,
            content,
            sha,
        }),
    });
    return res.ok;
}

/**
 * Get Developer's Key List
 */
export async function getDeveloperKeys(ownerId: string): Promise<ApiKeyMeta[]> {
    try {
        const path = `developers/${ownerId}.json`;
        const res = await fetch(repoUrl(path), { headers: headers() });
        if (!res.ok) return [];

        const fileData = await res.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return JSON.parse(content);
    } catch { return []; }
}

// ============================================
//  Secure Portal Operations
// ============================================

/**
 * Save an encrypted message for the public portal
 */
export async function saveSecureMessage(content: string): Promise<string> {
    const id = generateId();
    const path = `secure_portal/${id}.json`;
    const base64Content = Buffer.from(JSON.stringify({ content, createdAt: new Date().toISOString() })).toString('base64');

    const res = await fetch(repoUrl(path), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
            message: `🔒 New secure portal message ${id}`,
            content: base64Content,
        }),
    });

    if (!res.ok) throw new Error(`Failed to save secure message: ${res.status}`);
    return id;
}

/**
 * Get a secure message by ID
 */
export async function getSecureMessage(id: string): Promise<string | null> {
    try {
        const path = `secure_portal/${id}.json`;
        const res = await fetch(repoUrl(path), { headers: headers() });
        if (!res.ok) return null;

        const fileData = await res.json();
        const json = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return JSON.parse(json).content;
    } catch {
        return null;
    }
}

// ============================================
//  Address Claim Logic (Isolation)
// ============================================

/**
 * Claim an address for a specific session
 */
export async function claimAddress(address: string, sessionId: string): Promise<{ success: boolean; message?: string }> {
    const folder = encodeAddress(address);
    const path = `claims/${folder}.json`;

    // Check if claimed
    const existing = await getAddressOwner(address);
    if (existing && existing.sessionId !== sessionId) {
        // Check if the claim is "expired" (e.g. older than 24 hours) 
        // For simplicity now: strict denial if any claim exists
        const createdAt = new Date(existing.claimedAt);
        const now = new Date();
        const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) {
            return { success: false, message: 'Address is already in use by another session.' };
        }
    }

    // Save claim
    const claimData = {
        address,
        sessionId,
        claimedAt: new Date().toISOString()
    };
    const content = Buffer.from(JSON.stringify(claimData, null, 2)).toString('base64');

    // Get sha if exists
    const getRes = await fetch(repoUrl(path), { headers: headers() });
    let sha;
    if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
    }

    const res = await fetch(repoUrl(path), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
            message: `🔒 Claimed address ${address}`,
            content,
            sha
        }),
    });

    return { success: res.ok };
}

// --- Identity Logic (Multiple Sending Methods) ---

export interface IIdentity {
    address: string;
    type: 'internal' | 'external_smtp' | 'gmail_alias';
    smtpOptions?: {
        host: string;
        port: number;
        user: string;
        pass: string;
        secure: boolean;
    };
    verificationStatus: 'pending' | 'verified';
    verifiedAt?: string;
}

/**
 * Save a sender identity (SMTP or Alias)
 */
export async function saveIdentity(identity: IIdentity): Promise<boolean> {
    try {
        const folder = encodeAddress(identity.address);
        const path = `identities/${folder}.json`;
        const content = Buffer.from(JSON.stringify(identity, null, 2)).toString('base64');

        // Check for existing to get SHA if update
        let sha: string | undefined;
        try {
            const res = await fetch(repoUrl(path), { headers: headers() });
            if (res.ok) {
                const data = await res.json();
                sha = data.sha;
            }
        } catch { }

        const res = await fetch(repoUrl(path), {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify({
                message: `👤 Update identity for ${identity.address}`,
                content,
                sha
            }),
        });
        return res.ok;
    } catch (err) {
        console.error("Failed to save identity:", err);
        return false;
    }
}

/**
 * Get identity for a specific sender address
 */
export async function getIdentityForAddress(address: string): Promise<IIdentity | null> {
    try {
        const folder = encodeAddress(address);
        const path = `identities/${folder}.json`;
        const res = await fetch(repoUrl(path), { headers: headers() });
        if (!res.ok) return null;

        const fileData = await res.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return JSON.parse(content);
    } catch { return null; }
}

/**
 * Get the current owner of an address
 */
export async function getAddressOwner(address: string): Promise<{ sessionId: string; claimedAt: string } | null> {
    try {
        const folder = encodeAddress(address);
        const path = `claims/${folder}.json`;
        const res = await fetch(repoUrl(path), { headers: headers() });
        if (!res.ok) return null;

        const fileData = await res.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        return JSON.parse(content);
    } catch { return null; }
}
