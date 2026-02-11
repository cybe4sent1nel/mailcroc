import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'AI features not configured' }, { status: 503 });
    }

    try {
        const { text, subject } = await req.json();
        // Truncate input to avoid massive token usage/errors
        const prompt = `Summarize the following email concisely in bullet points or a short paragraph. Format the output in Markdown.
        
        Subject: ${subject}
        Content:
        ${text.slice(0, 4000)}`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "model": "nvidia/nemotron-3-nano-30b-a3b:free", // User specified free model
                "messages": [
                    { "role": "system", "content": "You are a helpful, professional email assistant. Summarize emails clearly." },
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
    } catch (error: any) {
        console.error('Summarize API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
