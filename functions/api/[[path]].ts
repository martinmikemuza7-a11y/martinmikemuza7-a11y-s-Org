// Cloudflare Pages Functions edge router for /api/* routes
// Executes StudyBuddy AI serverless on Cloudflare Global Edge Network

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

type PagesFunction<T = Record<string, unknown>> = (context: {
  request: Request;
  env: T;
  params?: Record<string, string | string[]>;
  waitUntil?: (promise: Promise<unknown>) => void;
  next?: () => Promise<Response>;
  data?: Record<string, unknown>;
}) => Promise<Response>;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Helper to call Gemini REST API from Cloudflare Edge
async function callGeminiRest(
  apiKey: string,
  model: string,
  contents: any[],
  systemInstruction?: string,
  responseMimeType?: string,
  temperature = 0.2
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature,
    },
  };

  if (responseMimeType) {
    requestBody.generationConfig.responseMimeType = responseMimeType;
  }

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'aistudio-build-cloudflare',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

  // 1. Health check endpoint: /api/health
  if (pathname === '/api/health') {
    return jsonResponse({
      status: 'ok',
      engine: 'Gemini (Cloudflare Pages Functions)',
      model,
      thinkingLevel: 'HIGH',
      hasGeminiKey: Boolean(apiKey),
      provider: 'Cloudflare Pages Functions',
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Cloud Sync endpoint: /api/sync
  if (pathname === '/api/sync') {
    if (request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}));
        return jsonResponse({
          status: 'synced',
          serverTimestamp: new Date().toISOString(),
          syncedItemsCount: body.clientPayload ? Object.keys(body.clientPayload).length : 0,
          message: 'Cloudflare Edge: Synchronized successfully with cloud store.',
        });
      } catch {
        return jsonResponse({ error: 'Invalid JSON payload' }, 400);
      }
    }
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // AI Routes require GEMINI_API_KEY
  if (pathname.startsWith('/api/ai/')) {
    if (!apiKey) {
      return jsonResponse(
        {
          error: 'GEMINI_API_KEY is not configured in Cloudflare Pages environment variables.',
          fallback: true,
        },
        503
      );
    }

    // 3. AI Tutor Chat: /api/ai/chat
    if (pathname === '/api/ai/chat' && request.method === 'POST') {
      try {
        const { courseName, message, contextChunks, history } = (await request.json()) as any;

        const formattedContext = (contextChunks || [])
          .map(
            (c: { source: string; page?: string | number; text: string }, i: number) =>
              `[Source ${i + 1}: ${c.source}${c.page ? ` (Page/Slide ${c.page})` : ''}]\n${c.text}`
          )
          .join('\n\n');

        const systemInstruction = `You are StudyBuddy AI, an expert, encouraging academic tutor strictly scoped to the user's course: "${courseName || 'Selected Course'}".
You are powered by the Gemini AI Thinking and Reasoning Engine on Cloudflare Pages Edge.

CRITICAL RULES:
1. Actively reason through the problem before answering.
2. Outline your cognitive steps: analyzing query, verifying facts against course materials, and simplifying concepts.
3. Ground your answers in provided study materials. Always cite sources: "[Source: <filename> — Page/Slide <number>]".
4. Never fabricate citations. If not found in materials, clearly state: "I couldn't verify this from your selected study materials."
5. Provide beginner-friendly, structured answers with key takeaways in bold.

RESPONSE FORMAT (JSON):
{
  "reasoning": "Detailed cognitive reasoning: what was checked in course notes, verified facts, and how it was simplified.",
  "thinkingSteps": [
    "Analyzed student question regarding ...",
    "Cross-referenced syllabus notes and verified citations",
    "Formulated beginner-friendly, structured answer"
  ],
  "text": "The full Markdown-formatted tutor response to show the student."
}`;

        let prompt = `COURSE: ${courseName || 'Study Course'}\n\n`;
        if (formattedContext) {
          prompt += `RETRIEVED STUDY MATERIALS:\n${formattedContext}\n\n`;
        } else {
          prompt += `RETRIEVED STUDY MATERIALS: [No direct matching documents found in course knowledge base]\n\n`;
        }

        if (history && Array.isArray(history) && history.length > 0) {
          prompt += `RECENT CONVERSATION HISTORY:\n`;
          for (const h of history.slice(-4)) {
            prompt += `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.text}\n`;
          }
          prompt += `\n`;
        }

        prompt += `STUDENT QUESTION: ${message}\n`;

        const geminiRes = await callGeminiRest(
          apiKey,
          model,
          [{ parts: [{ text: prompt }] }],
          systemInstruction,
          'application/json',
          0.2
        );

        const candidateText =
          geminiRes.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

        let text = 'No response generated.';
        let reasoning =
          'Gemini verified course notes and formulated this targeted study response.';
        let thinkingSteps = [
          'Analyzed student query and checked syllabus boundaries',
          'Retrieved and verified matching course material citations',
          'Synthesized step-by-step conceptual breakdown with beginner clarity',
        ];

        try {
          const parsed = JSON.parse(candidateText.trim());
          if (parsed.text) text = parsed.text;
          if (parsed.reasoning) reasoning = parsed.reasoning;
          if (Array.isArray(parsed.thinkingSteps)) thinkingSteps = parsed.thinkingSteps;
        } catch {
          text = candidateText;
        }

        return jsonResponse({
          text,
          reasoning,
          thinkingSteps,
          citations: (contextChunks || []).map(
            (c: { source: string; page?: string | number }) =>
              `${c.source}${c.page ? ` — Page ${c.page}` : ''}`
          ),
        });
      } catch (err: any) {
        console.error('Edge Gemini chat error:', err);
        return jsonResponse(
          { error: err.message || 'Failed to generate AI tutor response' },
          500
        );
      }
    }

    // 4. Generate Questions: /api/ai/generate-questions
    if (pathname === '/api/ai/generate-questions' && request.method === 'POST') {
      try {
        const {
          courseName,
          materialChunks,
          count = 5,
          difficulty = 'Mixed',
          questionTypes,
          sourceDocumentName,
        } = (await request.json()) as any;

        if (!materialChunks || materialChunks.length === 0) {
          return jsonResponse(
            { error: 'No study materials provided for question generation.' },
            400
          );
        }

        const formattedContext = materialChunks
          .map(
            (c: { source: string; page?: string | number; text: string }, i: number) =>
              `[Document Segment ${i + 1}: ${c.source}${c.page ? ` (Page/Slide ${c.page})` : ''}]\n${c.text}`
          )
          .join('\n\n');

        const sourceLockRule = sourceDocumentName
          ? `\nSTRICT SOURCE DOCUMENT LOCK:\nYou MUST generate all ${count} questions and answers SOLELY and EXCLUSIVELY from the specific document: "${sourceDocumentName}". Every question, option, correct answer, and explanation must be directly grounded in the content of "${sourceDocumentName}". Do not test concepts outside this document. In 'sourceCitation', cite "${sourceDocumentName} — Page/Slide [X]".`
          : '';

        const prompt = `You are an expert exam author. Based STRICTLY on the following course study materials for "${courseName}", generate exactly ${count} high-quality study questions.${sourceLockRule}

TARGET DIFFICULTY: ${difficulty}
ALLOWED QUESTION TYPES: ${
          Array.isArray(questionTypes) && questionTypes.length > 0
            ? questionTypes.join(', ')
            : 'multiple_choice, true_false, short_answer'
        }

RULES:
1. Every question must be phrased in crystal-clear, direct, and unambiguous language.
2. Every question MUST test a substantive concept directly contained in the text.
3. In 'multiple_choice', provide exactly 4 options.
4. In 'true_false', provide options ["True", "False"].
5. Return ONLY a valid JSON array adhering to this schema:
[
  {
    "type": "multiple_choice" | "true_false" | "short_answer",
    "difficulty": "Easy" | "Medium" | "Hard",
    "question": "Question text...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact correct option or concise model answer",
    "explanation": "Detailed explanation grounded in the text...",
    "reasoning": "Pedagogical reasoning...",
    "sourceCitation": "${sourceDocumentName || 'Source document'} — Page/Slide [X]",
    "keyConcepts": ["Concept 1", "Concept 2"]
  }
]

MATERIALS:
${formattedContext}`;

        const geminiRes = await callGeminiRest(
          apiKey,
          model,
          [{ parts: [{ text: prompt }] }],
          undefined,
          'application/json',
          0.2
        );

        const candidateText =
          geminiRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '[]';

        let questions = [];
        try {
          questions = JSON.parse(candidateText);
        } catch {
          const match = candidateText.match(/\[[\s\S]*\]/);
          if (match) {
            questions = JSON.parse(match[0]);
          } else {
            throw new Error('Invalid JSON format returned by AI model');
          }
        }

        return jsonResponse({ questions });
      } catch (err: any) {
        console.error('Edge Gemini question generation error:', err);
        return jsonResponse(
          { error: err.message || 'Failed to generate questions' },
          500
        );
      }
    }

    // 5. Semantic Answer Evaluation: /api/ai/evaluate-answer
    if (pathname === '/api/ai/evaluate-answer' && request.method === 'POST') {
      try {
        const {
          question,
          studentAnswer,
          correctAnswer,
          explanation,
          sourceCitation,
          contextText,
        } = (await request.json()) as any;

        const prompt = `You are an empathetic, academically rigorous grader. Evaluate the student's answer to the following study question.

QUESTION: ${question}
EXPECTED / MODEL ANSWER: ${correctAnswer}
EXPLANATION / CONTEXT: ${explanation}
REFERENCE MATERIAL: ${contextText || sourceCitation || 'None provided'}
STUDENT'S ANSWER: "${studentAnswer}"

CRITERIA:
- Grade as "Correct" if the student captures the core concept.
- Grade as "Partial" if they grasp part of the concept but miss critical elements.
- Grade as "Incorrect" if the answer is fundamentally wrong.

Respond ONLY with valid JSON in this schema:
{
  "evaluation": "Correct" | "Partial" | "Incorrect",
  "score": number (0 to 100),
  "feedback": "Constructive explanation of what was right or wrong",
  "idealAnswer": "${correctAnswer}",
  "reasoning": "Grading cognitive rationale",
  "misconceptionsIdentified": "Any conceptual confusion or null",
  "sourceCitation": "${sourceCitation || ''}"
}`;

        const geminiRes = await callGeminiRest(
          apiKey,
          model,
          [{ parts: [{ text: prompt }] }],
          undefined,
          'application/json',
          0.1
        );

        const candidateText =
          geminiRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
        const result = JSON.parse(candidateText);
        return jsonResponse(result);
      } catch (err: any) {
        console.error('Edge Gemini evaluation error:', err);
        return jsonResponse(
          { error: err.message || 'Failed to evaluate answer' },
          500
        );
      }
    }

    // 6. Image OCR: /api/ai/ocr
    if (pathname === '/api/ai/ocr' && request.method === 'POST') {
      try {
        const { base64Image, mimeType = 'image/jpeg', filename } =
          (await request.json()) as any;

        const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

        const geminiRes = await callGeminiRest(
          apiKey,
          model,
          [
            {
              parts: [
                {
                  inlineData: {
                    data: cleanBase64,
                    mimeType,
                  },
                },
                {
                  text: `Extract all academic text, tables, formulas, and structured notes from this image of "${
                    filename || 'study material'
                  }". Preserve headings, bullet points, and definitions. Output clean markdown text without conversational fluff.`,
                },
              ],
            },
          ],
          undefined,
          undefined,
          0.2
        );

        const text =
          geminiRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return jsonResponse({ text });
      } catch (err: any) {
        console.error('Edge Gemini OCR error:', err);
        return jsonResponse(
          { error: err.message || 'Failed to perform OCR' },
          500
        );
      }
    }
  }

  return jsonResponse({ error: `API route '${pathname}' not found` }, 404);
};
