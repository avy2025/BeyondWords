import express from 'express';

const router = express.Router();

/**
 * POST /api/voice/parse-intent
 *
 * Receives a voice transcript and sends it to Ollama for intent parsing.
 * Returns { action, password } where action is one of:
 *   START_MEET, JOIN_MEET, END_MEET, SEND_MESSAGE, UNKNOWN
 */
router.post('/parse-intent', async (req, res) => {
  const { transcript } = req.body;

  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ action: 'UNKNOWN', password: null });
  }

  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  const prompt = `You are a voice command parser for a video meeting app. Parse the user's voice command and return ONLY a raw JSON object with no explanation, no markdown, no code fences.

Valid actions:
- START_MEET: user wants to start/create a new meeting
- JOIN_MEET: user wants to join an existing meeting (extract room code/password if mentioned)
- END_MEET: user wants to end/leave the current meeting
- SEND_MESSAGE: user wants to send a chat message (extract the exact message text)

Return format: {"action": "ACTION_NAME", "password": "room_code_or_null", "message": "message_text_or_null"}

If the user mentions a room code, meeting ID, or password, extract it into the "password" field.
If the user wants to send a message, extract the CORE message content into the "message" field.
If no room code is mentioned for JOIN_MEET, set password to null.
If the command doesn't match any action, return {"action": "UNKNOWN", "password": null, "message": null}.

User said: "${transcript}"`
;

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0,
          num_predict: 100,
        },
      }),
    });

    if (!ollamaRes.ok) {
      console.error('Ollama API error:', ollamaRes.status, await ollamaRes.text());
      return res.json({ action: 'UNKNOWN', password: null });
    }

    const ollamaData = await ollamaRes.json();
    let response = ollamaData.response || '';
    console.log('🤖 Ollama Raw Response:', response);

    // Strip <think>...</think> tags (some models add these)
    response = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Strip markdown code fences if present
    response = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('🤖 No JSON found in Ollama response:', response);
      return res.json({ action: 'UNKNOWN', password: null });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('🤖 Parsed Intent:', parsed);
    return res.json({
      action: parsed.action || 'UNKNOWN',
      password: parsed.password || null,
      message: parsed.message || null,
    });
  } catch (err) {
    console.error('🤖 Parse intent error:', err);
    return res.json({ action: 'UNKNOWN', password: null });
  }
});

export default router;
