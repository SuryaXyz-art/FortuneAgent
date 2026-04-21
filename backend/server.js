import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

import path from 'path';
import { fileURLToPath } from 'url';

try {
  const metaUrl = typeof import.meta !== 'undefined' ? import.meta.url : null;
  if (metaUrl) {
    const __filename = fileURLToPath(metaUrl);
    const __dirname = path.dirname(__filename);
    dotenv.config({ path: path.join(__dirname, '../.env') });
  } else {
    dotenv.config();
  }
} catch (e) {
  // Ignored in lambda
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3001;

const horoscopeCache = {};

app.get('/api/horoscope/:sign', async (req, res) => {
  try {
    const sign = req.params.sign.toLowerCase();
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

    // FIXED: Using verified working endpoint and model name
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
});

function getZodiacSign(dateString) {
  const date = new Date(dateString);
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Pisces';
  
  return 'Unknown';
}

const analysisSessions = {};
const chatHistory = {};

app.post('/api/astro-agent/analyze', async (req, res) => {
  try {
    const { name, dateOfBirth, timeOfBirth, birthCity, birthCountry } = req.body;
    
    if (!name || !dateOfBirth || !birthCity || !birthCountry) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const calculatedSign = getZodiacSign(dateOfBirth);

    const apiKey = process.env.NOUS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Nous API key not configured' });
    }

    const projectId = process.env.NOUS_PROJECT_ID;

    const userPrompt = `Perform a deep astrological analysis for:
Name: ${name}
Date of Birth: ${dateOfBirth}
Time of Birth: ${timeOfBirth || 'unknown'}
Birth Place: ${birthCity}, ${birthCountry}
Sun Sign: ${calculatedSign}

Return JSON with these exact keys:
sunSign, moonSignEstimate, risingSignNote, personalityTraits (array of 5), 
lifePathTheme, loveCompatibility (array of 3 best signs), 
careerStrengths (array of 3), currentYearForecast (string), 
nextMonthForecast (string), lifeChallenges (array of 3), 
luckyNumbers (array of 3), luckyColors (array of 3),
spiritualMessage (inspiring paragraph), 
detailedLifeAnalysis (3 paragraphs as array of strings)`;

    // FIXED: Using verified working endpoint and model name
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
            content: "You are a master Vedic and Western astrologer. Respond ONLY in valid JSON."
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
        stream: false,
        ...(projectId ? { extra_body: { projectId } } : {})
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Cosmic analysis failed to connect' });
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      return res.status(500).json({ error: 'Cosmic analysis unavailable' });
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(content);
    } catch (e) {
      try {
        const cleanContent = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleanContent);
      } catch (err2) {
        return res.status(500).json({ error: 'Failed to interpret cosmic analysis JSON' });
      }
    }

    const sessionId = Date.now().toString();
    
    const result = {
      success: true,
      name,
      sign: calculatedSign,
      analysis: parsedData,
      sessionId
    };

    analysisSessions[sessionId] = result;

    return res.json(result);
  } catch (e) {
      console.error(e);
      return res.status(500).json({ error: 'An unexpected cosmic disruption occurred' });
  }
});

app.post('/api/astro-agent/chat', async (req, res) => {
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

    // FIXED: Using verified working endpoint and model name
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
});

app.post('/api/fortune', async (req, res) => {
  try {
    const zodiac = String(req.body?.zodiac || '').trim();
    if (!zodiac) {
      return res.status(400).json({ error: 'zodiac is required' });
    }

    const apiKey = process.env.NOUS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'NOUS_API_KEY is not set in .env' });
    }

    const projectId = process.env.NOUS_PROJECT_ID; // Nouswise requires projectId for routing.

    // FIXED: Using verified working endpoint and model name
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
            content:
              'You are a poetic fortune-teller. Respond with ONLY the fortune text. No preamble, no quotes, no markdown.'
          },
          {
            role: 'user',
            content: `Generate a short fortune for the zodiac sign: ${zodiac}. Keep it vivid but safe. 2-3 sentences maximum.`
          }
        ],
        temperature: 0.9,
        max_tokens: 500,
        stream: false,
        ...(projectId ? { extra_body: { projectId } } : {})
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return res.status(500).json({
        error: 'Nous API request failed',
        status: response.status,
        details: errText
      });
    }

    const data = await response.json();
    const fortune = data?.choices?.[0]?.message?.content;
    if (!fortune) {
      return res.status(500).json({ error: 'No fortune generated by Nous API' });
    }

    return res.json({ fortune });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unknown error' });
  }
});

if (!process.env.NETLIFY) {
  app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
  });
}

export default app;

