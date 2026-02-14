/* eslint-disable @typescript-eslint/no-require-imports */
const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const { createServer } = require("http");
const { Server } = require("socket.io");

// Load environment variables from .env.local if available
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const [key, ...valueParts] = trimmed.split("=");
            const value = valueParts.join("=").trim();
            if (!process.env[key.trim()]) {
                process.env[key.trim()] = value;
            }
        }
    });
}
async function getGmailAccessToken() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) return null;

    try {
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
        return data.access_token;
    } catch (e) {
        console.error("[Gmail API] Token Refresh Failed:", e.message);
        return null;
    }
}

async function verifyGmailAlias(email, code) {
    const token = await getGmailAccessToken();
    if (!token) return false;

    try {
        const res = await fetch(`https://www.googleapis.com/gmail/v1/users/me/settings/sendAs/${email}/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ verificationCode: code }),
        });
        return res.ok;
    } catch (e) {
        console.error("[Gmail API] Alias Verification API Failed:", e.message);
        return false;
    }
}

// Configuration
const SMTP_PORT = parseInt(process.env.SMTP_PORT || 25);
const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || 3001);
const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/webhook/email";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "dev-secret";

// Setup Socket.IO Server
const httpServer = createServer((req, res) => {
    // Enable CORS for localhost
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/notify') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // Validate payload
                if (!data || !data.to || !Array.isArray(data.to)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid payload' }));
                    return;
                }

                // Emit to Socket.IO
                console.log(`[API] Received notify request for: ${data.to.join(', ')}`);

                data.to.forEach(recipient => {
                    const exact = recipient.toLowerCase().trim();
                    const normalized = normalizeEmail(exact);

                    io.to(exact).emit("new_email", data);
                    if (normalized !== exact) {
                        io.to(normalized).emit("new_email", data);
                    }
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('[API] Error processing notify:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Default response
    res.writeHead(404);
    res.end();
});

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

/**
 * Normalize email for room matching:
 * Remove dots and +tag from local part for dot/plus trick support.
 */
function normalizeEmail(email) {
    const parts = email.toLowerCase().split('@');
    if (parts.length !== 2) return email.toLowerCase();
    const local = parts[0].split('+')[0].replace(/\./g, '');
    return `${local}@${parts[1]}`;
}

io.on("connection", (socket) => {
    socket.on("join", (emailAddress) => {
        if (emailAddress) {
            const exact = emailAddress.toLowerCase().trim();
            const normalized = normalizeEmail(emailAddress);
            socket.join(exact);
            socket.join(normalized);
            console.log(`Socket ${socket.id} joined: ${exact}${normalized !== exact ? ` + ${normalized}` : ''}`);
        }
    });

    socket.on("leave", (emailAddress) => {
        if (emailAddress) {
            socket.leave(emailAddress.toLowerCase().trim());
            socket.leave(normalizeEmail(emailAddress));
        }
    });
});

httpServer.listen(SOCKET_PORT, () => {
    console.log(`Socket.IO Server running on port ${SOCKET_PORT}`);
});

// Create SMTP Server (Catch-All)
const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    size: 10 * 1024 * 1024,

    onRcptTo(address, session, callback) {
        console.log(`RCPT TO: ${address.address}`);
        return callback();
    },

    onData(stream, session, callback) {
        simpleParser(stream, async (err, parsed) => {
            if (err) {
                console.error("Error parsing email:", err);
                return callback(new Error("Message parse error"));
            }

            console.log(`Received email from: ${parsed.from?.text} subject: ${parsed.subject}`);

            try {
                // Determine recipients
                let recipients = [];
                if (Array.isArray(parsed.to)) {
                    recipients = parsed.to.flatMap(t => t.value ? t.value.map(v => v.address) : [t.text]);
                } else if (parsed.to) {
                    recipients = parsed.to.value ? parsed.to.value.map(v => v.address) : [parsed.to.text];
                }
                if (recipients.length === 0 && session.envelope.rcptTo) {
                    recipients = session.envelope.rcptTo.map(r => r.address);
                }
                recipients = recipients.map(r => {
                    const match = r.match(/<(.+)>/);
                    return (match ? match[1] : r).trim().toLowerCase();
                }).filter(Boolean);

                console.log(`Recipients: ${recipients.join(', ')}`);

                const emailData = {
                    from: parsed.from?.text || 'unknown',
                    to: recipients,
                    subject: parsed.subject || '(No Subject)',
                    text: parsed.text || '',
                    html: parsed.html || '',
                    messageId: parsed.messageId || '',
                };

                // --- Handshake Automation for Gmail Alias Verification ---
                const isGoogleVerification =
                    (parsed.from?.text?.toLowerCase().includes('google.com') || parsed.from?.text?.toLowerCase().includes('gmail.com')) &&
                    (parsed.subject?.toLowerCase().includes('gmail confirmation') || parsed.text?.includes('verification code'));

                if (isGoogleVerification) {
                    console.log("[Handshake] Detected Google Verification Email!");

                    // 1. Try to find a link
                    const confirmLinkRegex = /https:\/\/mail\.google\.com\/mail\/f-\/[a-zA-Z0-9_-]+/g;
                    const linkMatch = (parsed.text || parsed.html || "").match(confirmLinkRegex);

                    // 2. Try to find a verification code (numeric)
                    const codeRegex = /verification code:?\s*(\d{6,})/i;
                    const codeMatch = (parsed.text || parsed.html || "").match(codeRegex);

                    if (linkMatch && linkMatch[0]) {
                        const confirmUrl = linkMatch[0];
                        console.log(`[Handshake] Auto-verifying via LINK: ${confirmUrl}`);
                        try {
                            const res = await fetch(confirmUrl);
                            console.log(`[Handshake] Verification request sent. Status: ${res.status}`);
                            console.log("[Handshake] Handshake complete. Skipping inbox delivery to keep it clean.");
                            return callback();
                        } catch (hvErr) {
                            console.error("[Handshake] Auto-verification failed:", hvErr.message);
                        }
                    } else if (codeMatch && codeMatch[1]) {
                        const code = codeMatch[1];
                        console.log(`[Handshake] Extracted Verification CODE: ${code}`);

                        // AUTO-VERIFY via Gmail API immediately
                        const targetAlias = recipients[0]; // The email address being verified
                        console.log(`[Handshake] Attempting API verification for: ${targetAlias}`);

                        verifyGmailAlias(targetAlias, code).then(success => {
                            if (success) {
                                console.log(`[Handshake] API SUCCESS! ${targetAlias} is now verified and ready.`);
                            } else {
                                console.log(`[Handshake] API verification failed for ${targetAlias}. Link verification might still work.`);
                            }
                        });

                        console.log("[Handshake] Handshake in progress. Delivery suppressed.");
                        return callback();
                    } else {
                        console.log("[Handshake] Could not find confirmation link or code in email body.");
                    }
                }

                // Save via webhook (GitHub DB)
                const webhookRes = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${WEBHOOK_SECRET}`,
                    },
                    body: JSON.stringify(emailData),
                });

                let savedId = '';
                if (webhookRes.ok) {
                    const result = await webhookRes.json();
                    savedId = result.id || '';
                    console.log("Email saved via webhook.");
                } else {
                    console.error("Webhook save failed:", webhookRes.status);
                }

                // Build the object to emit via Socket.IO
                const emitData = {
                    _id: savedId || `${Date.now()}`,
                    ...emailData,
                    receivedAt: new Date().toISOString(),
                    pinned: false,
                };

                // Emit to Socket rooms
                recipients.forEach(recipient => {
                    const exact = recipient;
                    const normalized = normalizeEmail(recipient);
                    console.log(`Emitting to: ${exact}${normalized !== exact ? ` + ${normalized}` : ''}`);
                    io.to(exact).emit("new_email", emitData);
                    if (normalized !== exact) {
                        io.to(normalized).emit("new_email", emitData);
                    }
                });

                callback();
            } catch (dbErr) {
                console.error("Error:", dbErr);
                callback(new Error("Internal server error"));
            }
        });
    },
});

server.on("error", (err) => {
    console.log("Error %s", err.message);
});

server.listen(SMTP_PORT, () => {
    console.log(`SMTP Server running on port ${SMTP_PORT}`);
    console.log(`Webhook: ${WEBHOOK_URL}`);
});
