const analysisSessions = {};

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

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
}
