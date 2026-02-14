import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    if (!process.env.ELEVENLABS_API_KEY) {
        return NextResponse.json({ error: 'Voice features not configured' }, { status: 503 });
    }

    try {
        const { text, gender } = await req.json();

        // Voice IDs (Standard Free Voices)
        const VOICE_RACHEL = '21m00Tcm4TlvDq8ikWAM'; // Female
        const VOICE_ANTONI = 'ErXw9S1S2OcAn966N6Iu'; // Male

        // Select Voice ID based on gender param, default to Rachel
        let voiceId = process.env.ELEVENLABS_VOICE_ID || VOICE_RACHEL;
        if (gender === 'male') voiceId = VOICE_ANTONI;
        if (gender === 'female') voiceId = VOICE_RACHEL;

        const options = {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text.slice(0, 1000), // Safety limit for free quota
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5,
                }
            }),
        };

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, options);

        if (!response.ok) {
            const error = await response.json();
            console.error('ElevenLabs API Error Details:', JSON.stringify(error, null, 2));
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
