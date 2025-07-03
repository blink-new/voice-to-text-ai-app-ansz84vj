import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface TranscriptionRequest {
  audio: string; // Base64 encoded audio data
  language?: string;
  model?: string;
  response_format?: 'json' | 'text' | 'verbose_json';
  temperature?: number;
  prompt?: string;
}

interface TranscriptionResponse {
  text: string;
  duration?: number;
  language?: string;
  segments?: Array<Record<string, unknown>>;
}

serve(async (req) => {
  // Handle CORS for frontend calls
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const { audio, language = 'en', model = 'whisper-1', response_format = 'json', temperature = 0, prompt }: TranscriptionRequest = await req.json();

    if (!audio) {
      return new Response(JSON.stringify({ error: 'Audio data is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Convert base64 to binary data
    const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    
    // Create FormData for OpenAI API
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', model);
    formData.append('language', language);
    formData.append('response_format', response_format);
    formData.append('temperature', temperature.toString());
    
    if (prompt) {
      formData.append('prompt', prompt);
    }

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'Transcription failed', details: errorText }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const transcriptionResult = await response.json();
    
    // Format response consistently
    const result: TranscriptionResponse = {
      text: transcriptionResult.text || '',
      duration: transcriptionResult.duration,
      language: transcriptionResult.language,
      segments: transcriptionResult.segments,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});