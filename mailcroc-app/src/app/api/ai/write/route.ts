import { NextResponse } from 'next/server';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL = 'nvidia/nemotron-3-nano-30b-a3b:free';
const FALLBACK_MODEL = 'openrouter/quasar-alpha';

async function callOpenRouter(messages: { role: string; content: string }[], model: string) {
    const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages }),
    });
    return await res.json();
}

export async function POST(req: Request) {
    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'AI features not configured' }, { status: 503 });
    }

    try {
        const { topic, recipient, tone, action } = await req.json();

        let systemPrompt = '';
        let userPrompt = '';

        if (action === 'summarize') {
            systemPrompt = `You are MailCroc AI — an expert email analyst. Your task is to produce clear, accurate summaries in Markdown format.

RULES:
1. Zero spelling or grammar errors — proofread everything.
2. Use bullet points, bold text, and concise language.
3. Highlight key dates, names, amounts, and action items.
4. Do NOT use conversational filler, greetings, or placeholder text like "[Recipient]".
5. Output only the summary — nothing else.`;

            userPrompt = `Summarise the following email content concisely:\n\n"${topic}"`;
        } else {
            systemPrompt = `You are MailCroc AI — a professional email writer. Write polished, well-structured emails.

RULES:
1. Use a ${tone || 'Professional'} tone throughout.
2. Zero spelling or grammar errors.
3. Be concise and clear — avoid filler words.
4. Do NOT use placeholders like "[Your Name]" or "[Company]" if that info is not available.
5. Write the email body directly — no meta-commentary.`;

            userPrompt = `Write a professional email to ${recipient || 'recipient'} about the following topic: "${topic}". Keep it concise and clear.`;
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        // Primary: nvidia/nemotron-3-nano-30b
        let data = await callOpenRouter(messages, PRIMARY_MODEL);

        // Fallback if primary fails
        if (data.error || !data.choices?.[0]?.message?.content) {
            console.warn('[Write] Primary model failed, trying fallback...', data.error);
            data = await callOpenRouter(messages, FALLBACK_MODEL);
        }

        if (data.error) throw new Error(data.error.message);

        return NextResponse.json({
            content: data.choices[0].message.content,
            subject: `Regarding: ${topic.slice(0, 30)}...`
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
