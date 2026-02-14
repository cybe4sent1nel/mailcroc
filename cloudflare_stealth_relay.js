
/**
 * MailCroc Stealth Relay (Cloudflare Worker)
 * This script sends emails via MailChannels to hide the primary Gmail identity.
 */

export default {
    async fetch(request, env, ctx) {
        try {
            const VERSION = "1.0.4";
            if (request.method === 'GET') return new Response(`Stealth Relay v${VERSION} Heartbeat OK`, { status: 200 });
            if (request.method !== 'POST') return new Response('Send via POST', { status: 405 });

            const EXPECTED_SECRET = 'mailcroc-wh-s3cret-2024';
            const secret = request.headers.get('x-mc-secret');

            if (secret !== EXPECTED_SECRET) {
                return new Response(`Unauthorized. Invalid secret.`, { status: 401 });
            }

            const bodyData = await request.json();
            const { from, to, subject, body, attachments } = bodyData;

            if (!from || !to) {
                return new Response(`Missing from/to`, { status: 400 });
            }

            const payload = {
                personalizations: [{ to: [{ email: to }] }],
                from: {
                    email: from,
                    name: from.split('@')[0]
                },
                subject: subject || '(No Subject)',
                content: [{ type: 'text/html', value: body || '(No Content)' }],
            };

            // MailChannels specific fetch for Cloudflare Workers
            const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'user-agent': 'Cloudflare-Workers'
                },
                body: JSON.stringify(payload),
            });

            const resText = await res.text();
            const responseHeaders = Object.fromEntries(res.headers.entries());

            if (!res.ok) {
                return new Response(JSON.stringify({
                    error: "MailChannels Rejected Request",
                    status: res.status,
                    mcResponse: resText,
                    mcHeaders: responseHeaders,
                    version: VERSION
                }), {
                    status: res.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(resText, { status: res.status });
        } catch (err) {
            return new Response(`Worker Crash: ${err.message}`, { status: 500 });
        }
    },
};
