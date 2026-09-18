// Cloudflare Pages Functions adapter for /api/* routes
// Allows StudyBuddy AI to run with full AI features on Cloudflare Pages

interface Env {
  GEMINI_API_KEY?: string;
}

type PagesFunction<T = Record<string, unknown>> = (context: {
  request: Request;
  env: T;
  params?: Record<string, string | string[]>;
  waitUntil?: (promise: Promise<unknown>) => void;
  next?: () => Promise<Response>;
  data?: Record<string, unknown>;
}) => Promise<Response>;

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Handle Health check
  if (pathname === '/api/health') {
    return new Response(
      JSON.stringify({
        status: 'healthy',
        timestamp: Date.now(),
        provider: 'Cloudflare Pages Functions',
        hasGeminiKey: Boolean(context.env.GEMINI_API_KEY),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle Sync endpoint
  if (pathname === '/api/sync') {
    if (context.request.method === 'POST') {
      try {
        const body = await context.request.json();
        return new Response(
          JSON.stringify({
            success: true,
            syncedAt: Date.now(),
            receivedPayload: body,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }

  // Handle AI proxy endpoint: /api/ai/generate
  if (pathname === '/api/ai/generate') {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'GEMINI_API_KEY not configured on Cloudflare Pages environment.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const { prompt } = (await context.request.json()) as { prompt?: string };
      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Direct Gemini REST call using Google GenAI API endpoint
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'API route not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
};
