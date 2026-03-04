export interface AIAnalysis {
    category: 'primary' | 'social' | 'updates' | 'promotions' | 'spam';
    isThreat: boolean;
    threatReason?: string;
    summary?: string;
}

export async function analyzeEmail(subject: string, content: string): Promise<AIAnalysis> {
    if (!process.env.OPENROUTER_API_KEY) {
        return { category: 'primary', isThreat: false };
    }

    try {
        const prompt = `Analyze this email. Return JSON only.
        {
          "category": "primary" | "social" | "updates" | "promotions" | "spam",
          "isThreat": boolean, // true if it contains social engineering (Phishing, Digital Arrest scams, Urgent Payment Fraud, Account Suspensions, Blackmail).
          "threatReason": "1 sentence explaining EXACTLY why it's a threat (or null if safe)",
          "summary": "1 sentence summary"
        }
        
        Subject: ${subject}
        Content: ${content.slice(0, 1000)}`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "model": "nvidia/nemotron-3-nano-30b-a3b:free",
                "messages": [{ "role": "user", "content": prompt }],
                "response_format": { type: "json_object" }
            })
        });

        const data = await response.json();
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
        console.error("AI Analysis Failed", e);
        return { category: 'primary', isThreat: false };
    }
}
