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
        const { text, subject, attachments } = await req.json();

        // Build attachment context if present
        let attachmentContext = '';
        if (attachments && attachments.length > 0) {
            attachmentContext = '\n\nAttachments:\n' + attachments.map((att: { name: string; type: string; size: number }) =>
                `- ${att.name} (${att.type}, ${(att.size / 1024).toFixed(1)} KB)`
            ).join('\n');
        }

        const systemPrompt = `You are MailCroc AI — a professional, meticulous email analysis assistant.

RULES YOU MUST FOLLOW:
1. Your output MUST be perfectly written with ZERO spelling or grammar errors.
2. Use well-structured Markdown with headers (##), bullet points, bold text, and emojis.
3. Be thorough, detailed, and insightful — provide real analysis, not generic filler.
4. Always include ALL required sections below — never skip any.
5. If analysing attachments, describe their likely purpose based on filenames and types.
6. Proofread your entire response before outputting it.`;

        const userPrompt = `Analyse this email and provide a detailed, structured summary in Markdown.

**Include ALL of these sections (use the exact headers):**

## 📋 Overview
A 2–3 sentence high-level summary describing what this email is about, who sent it, and its general purpose.

## 🔑 Key Points
- List every important point, request, or piece of information as bullet points
- Include specific names, dates, numbers, links, or deadlines mentioned
- Highlight action items with **bold**

## 👤 Sender Intent
One clear sentence about what the sender wants (e.g., "Requesting approval", "Sharing a report", "Confirming a subscription").

## 📎 Attachments
If attachments are present, describe what each likely contains based on filename and type. If none, write "No attachments included."

## ⚡ Priority
Rate as **High**, **Medium**, or **Low** — provide a brief reason.

---

**Email Subject:** ${subject || '(No Subject)'}

**Email Body:**
${(text || '').slice(0, 6000)}${attachmentContext}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        // Primary: nvidia/nemotron-3-nano-30b
        let data = await callOpenRouter(messages, PRIMARY_MODEL);

        // Fallback if primary fails
        if (data.error || !data.choices?.[0]?.message?.content) {
            console.warn('[Summarize] Primary model failed, trying fallback...', data.error);
            data = await callOpenRouter(messages, FALLBACK_MODEL);
        }

        if (data.error) {
            throw new Error(data.error.message || 'OpenRouter API Error');
        }

        const summary = data.choices?.[0]?.message?.content || 'Could not generate summary.';
        return NextResponse.json({ summary });
    } catch (error: unknown) {
        console.error('Summarize API Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
