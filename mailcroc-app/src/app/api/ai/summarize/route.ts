import { NextResponse } from 'next/server';

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

        const prompt = `You are an advanced email analysis assistant. Provide a detailed, well-structured summary of this email in **Markdown** format.

**CRITICAL: Your output MUST be 100% grammatically correct with zero spelling errors. Double-check every word before outputting.**

**Your summary MUST include all of the following sections (use the exact headers):**

## 📋 Overview
A 2-3 sentence high-level summary of what this email is about.

## 🔑 Key Points
- List every important point, request, or piece of information as bullet points
- Include names, dates, numbers, links, or deadlines mentioned
- If there are action items, highlight them with **bold**

## 👤 Sender Intent
One sentence about what the sender wants from the recipient (e.g., "Requesting a meeting", "Sharing information", "Confirmation of signup").

## 📎 Attachments
If attachments are present, describe what they likely contain based on their filenames and types. If no attachments, write "No attachments."

## ⚡ Priority
Rate as **High**, **Medium**, or **Low** with a brief reason.

---

**Email Subject:** ${subject || '(No Subject)'}

**Email Content:**
${(text || '').slice(0, 6000)}${attachmentContext}`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "model": "google/gemma-3-27b-it:free",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are MailCroc AI, a professional email analysis assistant. IMPORTANT RULES: (1) Your output MUST be 100% grammatically correct with ZERO spelling errors — proofread every word. (2) Always respond with well-structured Markdown using headers (##), bullet points, bold text, and emojis for visual clarity. (3) Be thorough, detailed, and insightful. (4) Never skip any section. (5) Do NOT produce any typos or misspellings under any circumstances."
                    },
                    { "role": "user", "content": prompt }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('OpenRouter Error:', data.error);
            throw new Error(data.error.message || 'OpenRouter API Error');
        }

        const summary = data.choices?.[0]?.message?.content || "Could not generate summary.";
        return NextResponse.json({ summary });
    } catch (error: unknown) {
        console.error('Summarize API Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
