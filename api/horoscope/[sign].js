const horoscopeCache = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const sign = req.query.sign || req.url.split('/').pop().split('?')[0].toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${sign}_${today}`;

    // 1-hour in-memory cache
    if (horoscopeCache[cacheKey] && (Date.now() - horoscopeCache[cacheKey].timestamp < 3600000)) {
      return res.json({ sign, date: today, horoscope: horoscopeCache[cacheKey].data });
    }

    const apiKey = process.env.NOUS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Horoscope unavailable' });
    }

    const projectId = process.env.NOUS_PROJECT_ID;

    const response = await fetch('https://inference-api.nousresearch.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nousresearch/hermes-3-llama-3.1-70b',
        messages: [
          {
            role: 'system',
            content: "You are a mystical astrologer. Respond ONLY in valid JSON, no markdown, no explanation outside JSON."
          },
          {
            role: 'user',
            content: `Give me today's horoscope for ${sign}. Return JSON with exactly these keys: general, love, career, health, luckyNumber, luckyColor, mood, advice`
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
        stream: false,
        ...(projectId ? { extra_body: { projectId } } : {})
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Horoscope unavailable' });
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Horoscope unavailable' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (e) {
      // Fallback if the LLM wraps the response in a markdown code block
      try {
        const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleanContent);
      } catch (err2) {
        return res.status(500).json({ error: 'Horoscope unavailable' });
      }
    }

    horoscopeCache[cacheKey] = {
      timestamp: Date.now(),
      data: parsedData
    };

    return res.json({ sign, date: today, horoscope: parsedData });
  } catch (e) {
    return res.status(500).json({ error: 'Horoscope unavailable' });
  }
}
