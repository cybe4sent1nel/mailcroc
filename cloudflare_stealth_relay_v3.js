
/**
 * MailCroc Stealth Relay V3 (Cloudflare Worker)
 * This script uses MailChannels via the "Domain Lockdown" method.
 */

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'GET') return new Response("Stealth Relay v3.0.0 Active", { status: 200 });
        if (request.method !== 'POST') return new Response('Use POST', { status: 405 });

        const secret = request.headers.get('x-mc-secret');
        if (secret !== 'mailcroc-wh-s3cret-2024') {
            return new Response('Unauthorized', { status: 401 });
        }

        try {
            const { from, to, subject, body } = await request.json();

            const mcPayload = {
                personalizations: [{ to: [{ email: to }] }],
                from: { email: from, name: "MailCroc Stealth" },
                subject: subject || "No Subject",
                content: [{ type: "text/html", value: body || " " }]
            };

            const mcRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(mcPayload),
            });

            const mcStatus = mcRes.status;
            const mcText = await mcRes.text();

            if (mcRes.ok) {
                return new Response("OK", { status: 200 });
            } else {
                return new Response(`MailChannels Error: ${mcStatus} - ${mcText}`, { status: mcStatus });
            }
        } catch (err) {
            return new Response(`Send Failed: ${err.message}`, { status: 500 });
        }
    }
};
