import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Helper to parse JSON body
async function parseJsonBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const body = await parseJsonBody(req);
  if (!body || typeof body.audio !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid audio (base64 string) in body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const language = body.language || 'en';
  const base64 = body.audio.replace(/^data:audio\/(\w+);base64,/, '');
  const audioBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  // Prepare multipart/form-data for OpenAI Whisper
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
  const CRLF = '\r\n';
  let form = '';
  form += `--${boundary}${CRLF}`;
  form += `Content-Disposition: form-data; name="file"; filename="audio.webm"${CRLF}`;
  form += `Content-Type: audio/webm${CRLF}${CRLF}`;
  // We'll append the binary buffer later
  form += `${CRLF}--${boundary}${CRLF}`;
  form += `Content-Disposition: form-data; name="model"${CRLF}${CRLF}`;
  form += `whisper-1${CRLF}`;
  form += `--${boundary}${CRLF}`;
  form += `Content-Disposition: form-data; name="language"${CRLF}${CRLF}`;
  form += `${language}${CRLF}`;
  form += `--${boundary}--${CRLF}`;

  // Build the full body as a Uint8Array
  const encoder = new TextEncoder();
  const formStart = encoder.encode(form.split('audio.webm')[0] + 'audio.webm' + CRLF + CRLF);
  const formEnd = encoder.encode(form.split('audio.webm')[1].replace(/^\r\n/, ''));
  const bodyBuffer = new Uint8Array(formStart.length + audioBuffer.length + formEnd.length);
  bodyBuffer.set(formStart, 0);
  bodyBuffer.set(audioBuffer, formStart.length);
  bodyBuffer.set(formEnd, formStart.length + audioBuffer.length);

  // Call OpenAI Whisper
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });
    const data = await openaiRes.json();
    if (!openaiRes.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: openaiRes.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return new Response(JSON.stringify({ text: data.text }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
