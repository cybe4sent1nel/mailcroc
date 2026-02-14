
/**
 * MailCroc Stealth Relay V4 (Minimalist)
 * This is the most compatible MailChannels format for Cloudflare Workers.
 */
export default {
    async fetch(request, env, ctx) {
        if (request.method !== 'POST') return new Response('POST only', { status: 405 });

        // Auth
        const secret = request.headers.get('x-mc-secret');
        if (secret !== 'mailcroc-wh-s3cret-2024') return new Response('Unauthorized', { status: 401 });

        try {
            const { from, to, subject, body } = await request.json();

            const send_request = new Request('https://api.mailchannels.net/tx/v1/send', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: to }] }],
                    from: { email: from, name: 'Stealth Relay' },
                    subject: subject,
                    content: [{ type: 'text/html', value: body }],
                }),
            });

            const res = await fetch(send_request);
            const resText = await res.text();

            return new Response(JSON.stringify({
                ok: res.ok,
                status: res.status,
                response: resText
            }), {
                status: res.status,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(e.message, { status: 500 });
        }
    }
}
