const analysisSessions = {};
const chatHistory = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const { sessionId, userMessage, userName, zodiacSign } = req.body;
    
    if (!sessionId || !userMessage) {
      return res.status(400).json({ error: 'Missing sessionId or userMessage' });
    }

    const storedAnalysis = analysisSessions[sessionId] ? analysisSessions[sessionId].analysis : 'No deep analysis available. Provide general guidance.';

    if (!chatHistory[sessionId]) {
      chatHistory[sessionId] = [];
    }

    const history = chatHistory[sessionId];

    const apiKey = process.env.NOUS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Nous API key not configured' });
    }

    const projectId = process.env.NOUS_PROJECT_ID;

    const systemPrompt = `You are ${userName || 'the user'}'s personal cosmic guide and astrologer. 
You have already analyzed their complete birth chart. 
Their zodiac sign is ${zodiacSign || 'unknown'}.
Their full analysis: ${JSON.stringify(storedAnalysis)}
Keep responses warm, mystical, personal, and under 150 words unless asked for detail.
Reference their specific analysis details when relevant.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userMessage }
    ];

    const response = await fetch('https://inference-api.nousresearch.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nousresearch/hermes-3-llama-3.1-70b',
        messages: messages,
        temperature: 0.8,
        max_tokens: 1000,
        stream: false,
        ...(projectId ? { extra_body: { projectId } } : {})
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Cosmic communication interrupted' });
    }

    const data = await response.json();
    const aiMessage = data?.choices?.[0]?.message?.content;
    
    if (!aiMessage) {
      return res.status(500).json({ error: 'Cosmic communication empty' });
    }

    // Add to history
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: aiMessage });

    // Cap history at 20 messages (10 interactions) to prevent token overflow
    if (history.length > 20) {
      chatHistory[sessionId] = history.slice(history.length - 20);
    }

    return res.json({ reply: aiMessage, sessionId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Cosmic connection lost' });
  }
}
