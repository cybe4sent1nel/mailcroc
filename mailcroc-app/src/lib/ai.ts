export interface AIAnalysis {
    category: 'primary' | 'social' | 'updates' | 'promotions' | 'spam';
    isThreat: boolean;
    threatReason?: string;
    summary?: string;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL = 'nvidia/nemotron-3-nano-30b-a3b:free';
const FALLBACK_MODEL = 'openrouter/quasar-alpha';

async function callOpenRouter(messages: { role: string; content: string }[], model: string, jsonMode = false) {
    const body: Record<string, unknown> = { model, messages };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    return await res.json();
}

export async function analyzeEmail(subject: string, content: string): Promise<AIAnalysis> {
    if (!process.env.OPENROUTER_API_KEY) {
        return { category: 'primary', isThreat: false };
    }

    try {
        const systemPrompt = `You are MailCroc Security AI — an expert email threat classifier. You analyse emails for phishing, scams, social engineering, and categorise them.

RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no extra text.
2. Be accurate: only flag genuine threats (phishing, digital arrest scams, payment fraud, account takeover, blackmail).
3. Do NOT flag legitimate marketing, newsletters, or transactional emails as threats.
4. Write the summary and threatReason with perfect grammar.`;

        const userPrompt = `Analyse this email. Return ONLY this JSON object:
{
  "category": "primary" | "social" | "updates" | "promotions" | "spam",
  "isThreat": boolean,
  "threatReason": "one sentence explaining why it is a threat (or null if safe)",
  "summary": "one sentence summary of the email"
}

Subject: ${subject}
Content: ${content.slice(0, 1500)}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        let data = await callOpenRouter(messages, PRIMARY_MODEL, true);

        // Fallback
        if (data.error || !data.choices?.[0]?.message?.content) {
            console.warn('[AI] Primary model failed for analysis, trying fallback...', data.error);
            data = await callOpenRouter(messages, FALLBACK_MODEL, true);
        }

        const contentJson = data.choices?.[0]?.message?.content;
        if (!contentJson) return { category: 'primary', isThreat: false };

        const result = JSON.parse(contentJson);
        return {
            category: result.category || 'primary',
            isThreat: !!result.isThreat,
            threatReason: result.threatReason || undefined,
            summary: result.summary
        };
    } catch (e) {
        console.error('AI Analysis Failed', e);
        return { category: 'primary', isThreat: false };
    }
}
