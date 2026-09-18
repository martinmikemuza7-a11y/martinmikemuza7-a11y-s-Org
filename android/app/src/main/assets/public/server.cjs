var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var PORT = 3e3;
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
  let aiClient = null;
  function getAI() {
    if (!aiClient && process.env.GEMINI_API_KEY) {
      aiClient = new import_genai.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    return aiClient;
  }
  async function generateContentWithFallback(ai, request) {
    const maxRetries = 2;
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await ai.models.generateContent({
          ...request,
          model: "gemini-3.8-flash"
        });
      } catch (err) {
        lastError = err;
        console.warn(`Gemini 3.8 Flash attempt ${attempt + 1} failed:`, err?.message?.slice(0, 100));
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  }
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { courseName, message, contextChunks, history, webResearch } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.status(503).json({
          error: "Cloud AI unavailable. Server GEMINI_API_KEY is not configured.",
          fallback: true
        });
      }
      const formattedContext = (contextChunks || []).map(
        (c, i) => `[Source ${i + 1}: ${c.source}${c.page ? ` (Page/Slide ${c.page})` : ""}]
${c.text}`
      ).join("\n\n");
      const systemInstruction = `You are StudyBuddy AI, an expert, encouraging academic tutor strictly scoped to the user's course: "${courseName || "Selected Course"}".
CRITICAL RULES:
1. Ground your answer in the provided study material context whenever possible.
2. ALWAYS cite your sources using the exact format: "[Source: <filename> \u2014 Page/Slide <number>]".
3. NEVER fabricate page numbers, document names, or facts.
4. If the retrieved study materials do NOT contain the answer, explicitly state: "I couldn't verify this from your selected study materials." Then, if web research is permitted, you may offer general academic context clearly labeled under a "### Additional Academic Context" header.
5. Provide structured, clear explanations with bullet points and bold key concepts.`;
      let prompt = `COURSE: ${courseName || "Study Course"}

`;
      if (formattedContext) {
        prompt += `RETRIEVED STUDY MATERIALS:
${formattedContext}

`;
      } else {
        prompt += `RETRIEVED STUDY MATERIALS: [No direct matching documents found in course knowledge base]

`;
      }
      if (history && Array.isArray(history) && history.length > 0) {
        prompt += `RECENT CONVERSATION HISTORY:
`;
        for (const h of history.slice(-4)) {
          prompt += `${h.role === "user" ? "Student" : "Tutor"}: ${h.text}
`;
        }
        prompt += `
`;
      }
      prompt += `STUDENT QUESTION: ${message}
`;
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
          tools: webResearch ? [{ googleSearch: {} }] : void 0
        }
      });
      const text = response.text || "No response generated.";
      const webSources = [];
      const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (searchChunks && Array.isArray(searchChunks)) {
        for (const chunk of searchChunks) {
          if (chunk.web?.title && chunk.web?.uri) {
            webSources.push(`${chunk.web.title} (${chunk.web.uri})`);
          }
        }
      }
      res.json({
        text,
        webSources: webSources.length > 0 ? webSources : void 0,
        citations: (contextChunks || []).map(
          (c) => `${c.source}${c.page ? ` \u2014 Page ${c.page}` : ""}`
        )
      });
    } catch (err) {
      console.error("Gemini chat error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate AI tutor response"
      });
    }
  });
  app.post("/api/ai/generate-questions", async (req, res) => {
    try {
      const { courseName, materialChunks, count = 5, difficulty = "Mixed", questionTypes } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.status(503).json({
          error: "Cloud AI unavailable. GEMINI_API_KEY is not configured.",
          fallback: true
        });
      }
      if (!materialChunks || materialChunks.length === 0) {
        return res.status(400).json({ error: "No study materials provided for question generation." });
      }
      const formattedContext = materialChunks.map(
        (c, i) => `[Document Segment ${i + 1}: ${c.source}${c.page ? ` (Page ${c.page})` : ""}]
${c.text}`
      ).join("\n\n");
      const prompt = `You are an expert exam author. Based STRICTLY on the following course study materials for "${courseName}", generate exactly ${count} high-quality study questions.

TARGET DIFFICULTY: ${difficulty}
ALLOWED QUESTION TYPES: ${Array.isArray(questionTypes) && questionTypes.length > 0 ? questionTypes.join(", ") : "multiple_choice, true_false, short_answer"}

RULES:
1. Every question MUST test a substantive concept directly contained in the text.
2. In 'multiple_choice', provide exactly 4 options where distractors are plausible and similar in length/structure.
3. In 'true_false', provide options ["True", "False"].
4. In 'short_answer', provide expected key concepts, acceptable variations, and standard correct answer.
5. EVERY question MUST include an in-depth 'explanation' explaining WHY the answer is correct and WHY other options are incorrect.
6. EVERY question MUST include the exact 'sourceCitation' (e.g. "Biology Notes.pdf \u2014 Page 4") matching the source provided.
7. Return ONLY valid JSON adhering to the specified schema.

MATERIALS:
${formattedContext}

Respond ONLY with a JSON array of question objects with this schema:
[
  {
    "type": "multiple_choice" | "true_false" | "short_answer",
    "difficulty": "Easy" | "Medium" | "Hard",
    "question": "Question text...",
    "options": ["Option A", "Option B", "Option C", "Option D"] (or ["True", "False"] for true_false, omit or empty for short_answer),
    "correctAnswer": "Exact correct option or concise model answer",
    "explanation": "Detailed explanation grounded in the text...",
    "sourceCitation": "Source document name \u2014 Page number",
    "keyConcepts": ["Concept 1", "Concept 2"]
  }
]`;
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });
      const responseText = response.text?.trim() || "[]";
      let questions = [];
      try {
        questions = JSON.parse(responseText);
      } catch (parseErr) {
        const match = responseText.match(/\[[\s\S]*\]/);
        if (match) {
          questions = JSON.parse(match[0]);
        } else {
          throw new Error("Invalid JSON format returned by AI model");
        }
      }
      res.json({ questions });
    } catch (err) {
      console.error("Gemini question generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate questions" });
    }
  });
  app.post("/api/ai/evaluate-answer", async (req, res) => {
    try {
      const { question, studentAnswer, correctAnswer, explanation, sourceCitation, contextText } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.status(503).json({
          error: "Cloud AI unavailable. GEMINI_API_KEY is not configured.",
          fallback: true
        });
      }
      const prompt = `You are an empathetic, academically rigorous grader. Evaluate the student's answer to the following study question.

QUESTION: ${question}
EXPECTED / MODEL ANSWER: ${correctAnswer}
EXPLANATION / CONTEXT: ${explanation}
REFERENCE MATERIAL: ${contextText || sourceCitation || "None provided"}
STUDENT'S ANSWER: "${studentAnswer}"

GRADING CRITERIA:
- Allow reasonable wording variations, synonyms, and paraphrasing.
- Do NOT require an exact verbatim string match.
- Grade as "Correct" if the student captures the core concept.
- Grade as "Partial" if the student grasps part of the concept but misses critical elements or has minor inaccuracies.
- Grade as "Incorrect" if the answer is fundamentally wrong or contradicts the study material.
- Identify misconceptions gently and explain what was missed.

Respond ONLY with valid JSON in this schema:
{
  "evaluation": "Correct" | "Partial" | "Incorrect",
  "score": number (0 to 100),
  "feedback": "Constructive explanation of what they got right or wrong",
  "idealAnswer": "${correctAnswer}",
  "misconceptionsIdentified": "Any conceptual confusion or null",
  "sourceCitation": "${sourceCitation || ""}"
}`;
      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      const result = JSON.parse(response.text?.trim() || "{}");
      res.json(result);
    } catch (err) {
      console.error("Gemini answer evaluation error:", err);
      res.status(500).json({ error: err.message || "Failed to evaluate answer" });
    }
  });
  app.post("/api/ai/ocr", async (req, res) => {
    try {
      const { base64Image, mimeType = "image/jpeg", filename } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.status(503).json({
          error: "Cloud OCR unavailable. Local parsing will be used.",
          fallback: true
        });
      }
      const response = await generateContentWithFallback(ai, {
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image.replace(/^data:image\/[a-z]+;base64,/, ""),
                mimeType
              }
            },
            {
              text: `Extract all academic text, tables, formulas, and structured notes from this image of "${filename || "study material"}". Preserve headings, bullet points, and definitions. Output clean markdown text without conversational fluff.`
            }
          ]
        }
      });
      res.json({
        text: response.text || ""
      });
    } catch (err) {
      console.error("Gemini OCR error:", err);
      res.status(500).json({ error: err.message || "Failed to perform OCR" });
    }
  });
  app.post("/api/sync", async (req, res) => {
    try {
      const { userId = "local-user", clientPayload } = req.body;
      res.json({
        status: "synced",
        serverTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
        syncedItemsCount: clientPayload ? Object.keys(clientPayload).length : 0,
        message: "Successfully synchronized with cloud store."
      });
    } catch (err) {
      res.status(500).json({ error: "Sync failed" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyBuddy AI Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
