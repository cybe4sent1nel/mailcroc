import PostalMime from 'postal-mime';

export default {
    /**
     * Cloudflare Email Worker
     * Receives incoming emails via Cloudflare Email Routing,
     * parses them, and POSTs to the Vercel webhook API.
     */
    async email(message, env, ctx) {
        try {
            // Read the raw email stream
            const rawEmail = await new Response(message.raw).arrayBuffer();

            // Parse with postal-mime
            const parser = new PostalMime();
            const parsed = await parser.parse(rawEmail);

            // Build the payload
            const payload = {
                from: message.from,
                to: message.to,
                subject: parsed.subject || '(No Subject)',
                text: parsed.text || '',
                html: parsed.html || '',
                messageId: parsed.messageId || '',
                headers: Object.fromEntries(
                    (parsed.headers || []).map(h => [h.key, h.value])
                ),
            };

            console.log(`Received email from ${message.from} to ${message.to}`);

            // POST to Vercel webhook
            const response = await fetch(env.WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.WEBHOOK_SECRET}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`Webhook failed: ${response.status} - ${errText}`);
                message.setReject(`Webhook error: ${response.status}`);
            } else {
                console.log('Email forwarded to webhook successfully');
            }
        } catch (err) {
            console.error('Email worker error:', err);
            message.setReject('Internal worker error');
        }
    },
};
