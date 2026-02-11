import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    if (!process.env.ELEVENLABS_API_KEY) {
        return NextResponse.json({ error: 'Voice features not configured' }, { status: 503 });
    }

    try {
        const { text } = await req.json();
        // Use configured Voice ID or default to "Rachel"
        const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

        const options = {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text.slice(0, 1000), // Safety limit for free quota
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                }
            }),
        };

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, options);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail?.message || 'ElevenLabs API Error');
        }

        const arrayBuffer = await response.arrayBuffer();

        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': arrayBuffer.byteLength.toString(),
            },
        });
    } catch (error: any) {
        console.error('Speech API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
