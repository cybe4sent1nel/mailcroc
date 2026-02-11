import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    if (!process.env.OPENROUTER_API_KEY) {
        return NextResponse.json({ error: 'AI features not configured' }, { status: 503 });
    }

    try {
        const { topic, recipient, tone } = await req.json();
        const prompt = `Write a professional email to ${recipient || 'recipient'} about the following topic: "${topic}".
        Tone: ${tone || 'Professional'}.
        Keep it concise and clear.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "model": "nvidia/nemotron-3-nano-30b-a3b:free",
                "messages": [
                    { "role": "system", "content": "You are a professional email writer." },
                    { "role": "user", "content": prompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return NextResponse.json({
            content: data.choices[0].message.content,
            subject: `Regarding: ${topic.slice(0, 30)}...` // Simple subject generation
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
