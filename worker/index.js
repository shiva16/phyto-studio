const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const ALLOWED_ORIGINS = [
  'https://shiva16.github.io',
  'https://phytolabs.in',
  'https://tcplants.in',
  'https://carnivorousplants.in',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ status: 'ok', service: 'Phyto Studio AI' }, 200, cors);
    }

    // AI generation endpoint
    if (url.pathname === '/generate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { messages, model = 'fast' } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          return json({ error: 'messages array is required' }, 400, cors);
        }

        const modelId = model === 'quality'
          ? 'llama-3.3-70b-versatile'
          : 'llama-3.1-8b-instant';

        const groqRes = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelId,
            messages,
            max_tokens: 2048,
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        });

        const data = await groqRes.json();

        if (!groqRes.ok) {
          return json({ error: data.error?.message || 'Groq error', details: data }, groqRes.status, cors);
        }

        return json(data, 200, cors);

      } catch (err) {
        return json({ error: err.message }, 500, cors);
      }
    }

    return json({ error: 'Not found' }, 404, cors);
  },
};
