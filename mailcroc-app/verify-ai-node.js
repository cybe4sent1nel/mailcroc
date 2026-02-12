const puter = require('@heyputer/puter.js');

// Helper for readable output
const log = (msg) => console.log(`[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${msg}`);

log('Puter Object:', puter);
if (puter && puter.ai) log('puter.ai is present'); else log('puter.ai is MISSING');

async function runTests() {
    log('Starting Puter.js AI Verification...');

    // 1. TEXT GENERATION (Kimi)
    log('\n--- 1. Testing Text Generation (Kimi) ---');
    try {
        const textPrompt = "Explain recursion in one sentence.";
        log(`Prompt: "${textPrompt}"`);

        // Puter logic: puter.ai.chat(prompt, options)
        const textResponse = await puter.ai.chat(textPrompt, { model: 'kimi' });

        let content = "";
        if (typeof textResponse === 'string') {
            content = textResponse;
        } else if (textResponse?.message?.content) {
            content = textResponse.message.content;
        } else {
            content = JSON.stringify(textResponse);
        }

        log(`Response: ${content}`);
        log('✅ Text Test: SUCCESS');
    } catch (err) {
        log(`❌ Text Test: FAILED - ${err.message}`);
    }

    // 2. SPEECH SYNTHESIS (ElevenLabs)
    log('\n--- 2. Testing Speech Synthesis (ElevenLabs) ---');
    try {
        const speechText = "MailCroc uses advanced AI for privacy.";
        // Testing a few voices
        const voices = [
            { id: 'Rachel', name: 'Female (Rachel)' },
            { id: 'Drew', name: 'Male (Drew)' }
        ];

        for (const voice of voices) {
            log(`Synthesizing: "${speechText}" with voice: ${voice.name}`);

            // Puter logic: puter.ai.txt2speech(text, options)
            const audioResponse = await puter.ai.txt2speech(speechText, {
                model: 'eleven_turbo_v2',
                voice: voice.id
            });

            if (audioResponse) {
                log(`✅ Speech Test (${voice.name}): SUCCESS (Audio received)`);
                // Note: In Node.js environment, we can't 'play' audio easily without extra libs, 
                // but receiving a response confirms API works.
            } else {
                throw new Error("No audio data returned");
            }
        }
    } catch (err) {
        log(`❌ Speech Test: FAILED - ${err.message}`);
    }

    // 3. VISION (GPT-4o / Vision Compatible)
    log('\n--- 3. Testing Vision Analysis ---');
    try {
        // Since we don't have a local image file easily accessible to upload via node in this simple script 
        // without more setup (fs read, blob conversion), we will skip deep vision testing here 
        // or try a text-only prompt to the vision model to check availability.

        log('Checking Vision Model Availability (Text-only prompt to vision model)...');
        const visionResponse = await puter.ai.chat("Describe a sunset.", { model: 'gpt-4o' });

        let content = "";
        if (typeof visionResponse === 'string') {
            content = visionResponse;
        } else if (visionResponse?.message?.content) {
            content = visionResponse.message.content;
        } else {
            content = JSON.stringify(visionResponse);
        }

        log(`Response from Vision Model: ${content}`);
        log('✅ Vision Availability: SUCCESS');

    } catch (err) {
        log(`❌ Vision Test: FAILED - ${err.message}`);
    }

    log('\nVerification Complete.');
}

runTests();
