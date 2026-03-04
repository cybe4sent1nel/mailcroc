import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'AI features not configured' }, { status: 503 });
    }

    try {
        const { topic, recipient, tone, action } = await req.json();

        let systemPrompt = "You are a professional business email assistant.";
        let assistantPrompt = "";

        if (action === 'summarize') {
            systemPrompt = "You are an expert email analyst. Summarize emails concisely into a clear, formatted summary using Markdown. Highlight key dates, names, or actions. Do NOT use conversational filler, greetings, or placeholders like '[Recipient]'. Provide the raw summary only.";
            assistantPrompt = `Summarize this email content: "${topic}"`;
        } else {
            systemPrompt = `You are a professional email writer. Use a ${tone || 'Professional'} tone.`;
            assistantPrompt = `Write a professional email to ${recipient || 'recipient'} about the following topic: "${topic}". Keep it concise and clear. Do NOT use placeholders if information isn't available.`;
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "model": "nvidia/nemotron-3-nano-30b-a3b:free",
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": assistantPrompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return NextResponse.json({
            content: data.choices[0].message.content,
            subject: `Regarding: ${topic.slice(0, 30)}...` // Simple subject generation
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
