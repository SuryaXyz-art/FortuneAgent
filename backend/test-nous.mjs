import fetch from 'node-fetch';

const API_KEY = 'sk-cn613ix16aecmae85vip0q';
const URL = 'https://inference-api.nousresearch.com/v1/chat/completions';

// Test with different model names to find the right one
const MODELS = [
  'nousresearch/hermes-3-llama-3.1-70b',
  'hermes-3-llama-70b',
  'nousresearch/hermes-4-70b'
];

for (const model of MODELS) {
  console.log(`\n--- Testing model: ${model} ---`);
  try {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Say hi' }],
        temperature: 0.7,
        max_tokens: 20
      })
    });
    console.log('Status:', response.status);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ WORKS! Model used:', data.model);
      console.log('AI:', data.choices?.[0]?.message?.content?.slice(0, 80));
    } else {
      const t = await response.text();
      console.log('❌ FAILED:', t.slice(0, 150));
    }
  } catch (e) {
    console.log('❌ Error:', e.message.slice(0, 80));
  }
}
