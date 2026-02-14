
/**
 * Gmail API Utilities for Stealth Sending and Alias Management
 */

export async function getGmailAccessToken() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
        throw new Error("Gmail API credentials missing from .env.local");
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: GMAIL_CLIENT_ID,
            client_secret: GMAIL_CLIENT_SECRET,
            refresh_token: GMAIL_REFRESH_TOKEN,
            grant_type: 'refresh_token',
        }),
    });

    const data = await response.json();
    if (!data.access_token) throw new Error("Failed to get Gmail access token: " + JSON.stringify(data));
    return data.access_token;
}

export async function ensureGmailAlias(email: string, accessToken: string) {
    // 1. Check if alias already exists
    const listRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/settings/sendAs', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const listData = await listRes.json();
    const existing = listData.sendAs?.find((s: any) => s.sendAsEmail === email);

    if (existing && existing.verificationStatus === 'accepted') {
        return true;
    }

    // 2. Add as new alias
    console.log(`Adding new Gmail alias: ${email}`);
    const createRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/settings/sendAs', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sendAsEmail: email,
            displayName: "MailCroc User",
            treatAsAlias: true
        }),
    });

    if (!createRes.ok) {
        const err = await createRes.json();

        // Handle specific error cases
        if (err.error?.code === 409) {
            console.log(`[Gmail Alias] Address ${email} already exists`);
            return true;
        }

        if (err.error?.code === 403 && err.error?.message?.includes('domain-wide authority')) {
            console.warn(`[Gmail Alias] Skipping auto-alias for ${email} - Personal Gmail accounts don't support programmatic alias creation. Using Master Relay instead.`);
            return false; // Signal that we should use Master Relay
        }

        throw new Error(`Failed to create alias: ${JSON.stringify(err)}`);
    }

    // 3. Auto-Verify Logic
    // We poll the inbox for the verification mail
    console.log("Polling for Gmail verification email...");
    for (let i = 0; i < 10; i++) { // Max 10 attempts (30 seconds)
        await new Promise(r => setTimeout(r, 3000));

        const messagesRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?q=from:orders-noreply@google.com subject:"Gmail Confirmation" ${email}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const messagesData = await messagesRes.json();

        if (messagesData.messages?.length > 0) {
            const msgId = messagesData.messages[0].id;
            const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msgId}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const msgData = await msgRes.json();

            // Extract code correctly from snippet or body
            const snippet = msgData.snippet || "";
            const match = snippet.match(/confirmation code:\s*(\d+)/i) || snippet.match(/code:\s*(\d+)/i);
            const code = match ? match[1] : null;

            if (code) {
                console.log(`Found verification code: ${code}. Verifying...`);
                const verifyRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/settings/sendAs/${email}/verify`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ verificationCode: code }),
                });

                if (verifyRes.ok) {
                    console.log("Alias verified successfully!");
                    return true;
                }
            }
        }
    }

    // If polling fails, we still return true but it might have "on behalf of"
    console.warn("Auto-verification timed out. Email will be sent but might have 'on behalf of' label.");
    return true;
}

export async function sendWithGmailApi(to: string, from: string, subject: string, bodyContent: string, attachments: any[] = []) {
    const accessToken = await getGmailAccessToken();

    // Construct MIME message
    const boundary = "MC_BOUNDARY_" + Date.now();
    let message = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        bodyContent,
        '',
    ];

    // Add attachments if any
    if (attachments && attachments.length > 0) {
        for (const att of attachments) {
            const content = att.content.split(',')[1];
            message.push(`--${boundary}`);
            message.push(`Content-Type: ${att.type}; name="${att.name}"`);
            message.push('Content-Transfer-Encoding: base64');
            message.push(`Content-Disposition: attachment; filename="${att.name}"`);
            message.push('');
            message.push(content);
            message.push('');
        }
    }

    message.push(`--${boundary}--`);

    const rawMessage = Buffer.from(message.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawMessage })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gmail API Send Error: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

/**
 * Sends an email using the 'Master Relay' strategy.
 * This uses a verified alias (relay@mailcroc.qzz.io) to mask the primary Gmail address
 * while still appearing as the custom stealth address to the recipient.
 */
export async function sendStealthWithMasterRelay(to: string, from: string, subject: string, bodyContent: string, attachments: any[] = []) {
    const accessToken = await getGmailAccessToken();

    // Choose the correct shield based on the domain
    const domain = from.split('@')[1];
    const MASTER_RELAY = domain === "mailpanda.qzz.io"
        ? "relay@mailpanda.qzz.io"
        : "relay@mailcroc.qzz.io";

    console.log(`[Master-Relay] V6 Golden Mask for ${from} via ${MASTER_RELAY}`);

    // MIME Construction with Display Name Masking
    const boundary = "MC_STEALTH_V6_" + Date.now();
    let message = [
        `From: "${from}" <${MASTER_RELAY}>`, // The "Golden Mask"
        `Reply-To: ${from}`, // Responses go back to the temp address
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        bodyContent,
        '',
    ];

    if (attachments && attachments.length > 0) {
        for (const att of attachments) {
            const content = att.content.split(',')[1];
            message.push(`--${boundary}`);
            message.push(`Content-Type: ${att.type}; name="${att.name}"`);
            message.push('Content-Transfer-Encoding: base64');
            message.push(`Content-Disposition: attachment; filename="${att.name}"`);
            message.push('');
            message.push(content);
            message.push('');
        }
    }
    message.push(`--${boundary}--`);

    const rawMessage = Buffer.from(message.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawMessage })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Master Relay Error: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

/**
 * Uploads a sent email directly to the Gmail "SENT" folder.
 * This is used for the "Sync-Stealth" workaround where we send via direct SMTP
 * but still want the record in Gmail.
 */
export async function syncToGmailSentFolder(to: string, from: string, subject: string, bodyContent: string, attachments: any[] = []) {
    try {
        const accessToken = await getGmailAccessToken();

        // Construct identical MIME message to the one sent
        const boundary = "MC_SYNC_BOUNDARY_" + Date.now();
        let message = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset="UTF-8"',
            'Content-Transfer-Encoding: 7bit',
            '',
            bodyContent,
            '',
        ];

        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                const content = att.content.split(',')[1];
                message.push(`--${boundary}`);
                message.push(`Content-Type: ${att.type}; name="${att.name}"`);
                message.push('Content-Transfer-Encoding: base64');
                message.push(`Content-Disposition: attachment; filename="${att.name}"`);
                message.push('');
                message.push(content);
                message.push('');
            }
        }
        message.push(`--${boundary}--`);

        const rawMessage = Buffer.from(message.join('\r\n'))
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Use the 'insert' endpoint with label 'SENT'
        const response = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/messages?uploadType=media', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'message/rfc822'
            },
            body: message.join('\r\n')
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`[Gmail Sync] Failed to insert to Sent:`, error);
            return false;
        }

        // Add 'SENT' label to the inserted message
        const data = await response.json();
        await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${data.id}/modify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                addLabelIds: ['SENT'],
                removeLabelIds: ['INBOX']
            })
        });

        console.log(`[Gmail Sync] Successfully synced message ${data.id} to Sent folder.`);
        return true;
    } catch (err) {
        console.error(`[Gmail Sync] Unexpected error:`, err);
        return false;
    }
}
