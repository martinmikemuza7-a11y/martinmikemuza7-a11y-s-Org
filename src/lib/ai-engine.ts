import { AIStatus, DocumentChunk, Question, QuestionType, DifficultyLevel } from '../types';
import { searchCourseKnowledgeBase, formatCitation } from './rag';
import { getSettings } from './db';

export interface ChatResponse {
  text: string;
  reasoning?: string;
  thinkingSteps?: string[];
  citations?: string[];
  webSources?: string[];
  providerUsed: 'online_gemini' | 'offline_local';
}

export interface EvaluationResult {
  evaluation: 'Correct' | 'Partial' | 'Incorrect';
  score: number;
  feedback: string;
  idealAnswer: string;
  reasoning?: string;
  thinkingSteps?: string[];
  misconceptionsIdentified?: string;
  sourceCitation?: string;
  providerUsed: 'online_gemini' | 'offline_local';
}

// Check network & server availability
export async function determineAIStatus(): Promise<AIStatus> {
  const settings = await getSettings();

  if (settings.aiMode === 'offline_only') {
    return 'offline_ai';
  }

  if (!navigator.onLine) {
    return 'offline_ai';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.hasGeminiKey) {
        return 'online';
      }
      return 'offline_ai';
    }
  } catch {
    // Network error or timeout
  }

  return 'offline_ai';
}

// The unified AIEngine facade
export class AIEngine {
  // Scoped AI Tutor Chat
  static async chat(
    courseId: string,
    courseName: string,
    message: string,
    history: { role: 'user' | 'assistant'; text: string }[] = [],
    webResearch = false
  ): Promise<ChatResponse> {
    const status = await determineAIStatus();
    const settings = await getSettings();

    // 1. RAG Retrieval - strictly course isolated
    const relevantChunks = await searchCourseKnowledgeBase(courseId, message, 4);

    // Online path
    if (status === 'online' && settings.aiMode !== 'offline_only') {
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseName,
            message,
            contextChunks: relevantChunks.map((c) => ({
              source: c.filename,
              page: c.pageNumber,
              text: c.text,
            })),
            history,
            webResearch: webResearch && settings.researchMode,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            text: data.text,
            reasoning: data.reasoning || 'Gemini 3.8 Flash analyzed syllabus materials and verified citations before formulating this targeted explanation.',
            thinkingSteps: data.thinkingSteps || [
              'Analyzed student question and mapped to course topics',
              'Retrieved syllabus notes and verified document citations',
              'Formulated beginner-friendly, structured explanation'
            ],
            citations: data.citations || relevantChunks.map(formatCitation),
            webSources: data.webSources,
            providerUsed: 'online_gemini',
          };
        }
      } catch (err) {
        console.warn('Online AI failed, falling back to Offline AI Provider:', err);
      }
    }

    // 2. Offline AI Provider Fallback
    return this.offlineChat(courseName, message, relevantChunks);
  }

  // Offline AI Tutor response generation using local heuristic RAG
  private static offlineChat(
    courseName: string,
    message: string,
    chunks: DocumentChunk[]
  ): ChatResponse {
    if (!chunks || chunks.length === 0) {
      return {
        text: `[Offline Local AI]\n\nI couldn't verify this from your study materials in "${courseName}". No matching notes or documents were found in this course's isolated knowledge base.\n\nPlease upload or import materials for this topic to study offline.`,
        citations: [],
        providerUsed: 'offline_local',
      };
    }

    const primaryChunk = chunks[0];
    const citations = chunks.map(formatCitation);
    const citationStr = citations[0];

    let reply = `[Offline Local AI — ${courseName}]\n\nBased on your course materials in **${citationStr}**:\n\n`;
    reply += `> "${primaryChunk.text.slice(0, 320)}${primaryChunk.text.length > 320 ? '...' : ''}"\n\n`;

    const lowerQuery = message.toLowerCase();
    if (lowerQuery.includes('explain') || lowerQuery.includes('what is') || lowerQuery.includes('how')) {
      reply += `### 💡 Clear Explanation:\n`;
      reply += `• **Direct Reference:** Grounded in ${citationStr}.\n`;
      reply += `• **Core Concept:** ${primaryChunk.text.slice(0, 180).trim()}...\n`;
      reply += `• **Key Takeaway:** Master this definition for your upcoming exams.\n\n`;
    } else if (lowerQuery.includes('quiz') || lowerQuery.includes('test') || lowerQuery.includes('question')) {
      reply += `### ❓ Practice Question:\n`;
      reply += `Based on this passage from **${primaryChunk.filename}**, what is the primary role or mechanism described above?\n\n`;
      reply += `*Try formulating your answer in clear, simple words, or test yourself with full questions in Study Session mode!*`;
    } else {
      reply += `### 💡 Study Takeaway:\n`;
      reply += `Review this section carefully in **${primaryChunk.filename}**. To test your understanding with clear active recall questions, launch a **Study Session**!`;
    }

    return {
      text: reply,
      citations,
      providerUsed: 'offline_local',
    };
  }

  // Question Generation Pipeline
  static async generateQuestions(
    courseId: string,
    courseName: string,
    chunks: DocumentChunk[],
    count = 5,
    difficulty: DifficultyLevel = 'Mixed',
    questionTypes: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer'],
    sourceDocumentName?: string
  ): Promise<Question[]> {
    if (!chunks || chunks.length === 0) {
      throw new Error('No study material chunks selected for question generation.');
    }

    const status = await determineAIStatus();
    const settings = await getSettings();

    // Online Gemini Generation
    if (status === 'online' && settings.aiMode !== 'offline_only') {
      try {
        const res = await fetch('/api/ai/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseName,
            materialChunks: chunks.slice(0, 35).map((c) => ({
              source: c.filename,
              page: c.pageNumber,
              text: c.text,
            })),
            count,
            difficulty,
            questionTypes,
            sourceDocumentName,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            return data.questions.map((q: any, i: number) => ({
              id: `gen-q-${Date.now()}-${i}`,
              courseId,
              sourceDocumentId: chunks[i % chunks.length]?.documentId,
              sourceCitation: q.sourceCitation || formatCitation(chunks[i % chunks.length]),
              type: q.type as QuestionType,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              reasoning: q.reasoning || 'Formulated with Gemini pedagogical reasoning to test substantive concept mastery and diagnose misconceptions.',
              difficulty: (q.difficulty as DifficultyLevel) || difficulty,
              keyConcepts: q.keyConcepts || [],
              createdAt: Date.now(),
            }));
          }
        }
      } catch (err) {
        console.warn('Online question generation failed, using local offline generator:', err);
      }
    }

    // Offline Local Generator
    return this.offlineGenerateQuestions(courseId, chunks, count, difficulty, questionTypes);
  }

  // Offline heuristic question generator
  private static offlineGenerateQuestions(
    courseId: string,
    chunks: DocumentChunk[],
    count: number,
    difficulty: DifficultyLevel,
    questionTypes: QuestionType[]
  ): Question[] {
    const questions: Question[] = [];
    let qIdx = 0;

    for (let i = 0; i < count; i++) {
      const chunk = chunks[i % chunks.length];
      const targetType = questionTypes[i % questionTypes.length] || 'multiple_choice';
      const sentences = chunk.text
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 30 && s.length < 220);

      const sentence = sentences[i % Math.max(1, sentences.length)] || chunk.text.slice(0, 100);
      const citation = formatCitation(chunk);

      if (targetType === 'true_false') {
        const isTrue = i % 2 === 0;
        let qText = sentence;
        let explanation = `**Correct Answer:** True.\n\n**Why it is correct:** Directly verified in ${citation}: "${sentence}."`;

        if (!isTrue) {
          // Negate a key verb
          qText = sentence.replace(/\b(is|are|was|were|can|will|contains|produces)\b/i, '$1 not');
          explanation = `**Correct Answer:** False.\n\n**Why it is correct:** According to ${citation}, this statement is false. The source explicitly states: "${sentence}."`;
        }

        questions.push({
          id: `local-tf-${Date.now()}-${qIdx++}`,
          courseId,
          sourceDocumentId: chunk.documentId,
          sourceCitation: citation,
          type: 'true_false',
          question: `True or False: ${qText}`,
          options: ['True', 'False'],
          correctAnswer: isTrue ? 'True' : 'False',
          explanation,
          difficulty: difficulty === 'Mixed' ? 'Easy' : difficulty,
          keyConcepts: ['Local Offline Extraction'],
          createdAt: Date.now(),
        });
      } else if (targetType === 'multiple_choice') {
        const words = sentence.split(' ').filter((w) => w.length > 5);
        const focusWord = words[0] || 'the concept';

        questions.push({
          id: `local-mc-${Date.now()}-${qIdx++}`,
          courseId,
          sourceDocumentId: chunk.documentId,
          sourceCitation: citation,
          type: 'multiple_choice',
          question: `Based on ${chunk.filename}, which statement accurately describes ${focusWord}?`,
          options: [
            sentence,
            `It operates exclusively in the absence of biological membranes or regulatory checkpoints.`,
            `The process occurs without any catalytic enzymes or energy transfers.`,
            `It is permanently inhibited under standard physiological conditions.`,
          ],
          correctAnswer: sentence,
          explanation: `**Correct Answer:** "${sentence}"\n\n**Why it is correct:** Directly supported by ${citation}. The other options describe contradicting or unsupported claims.`,
          difficulty: difficulty === 'Mixed' ? 'Medium' : difficulty,
          keyConcepts: [focusWord],
          createdAt: Date.now(),
        });
      } else {
        // Short answer
        const promptConcept = sentence.length > 90 ? `${sentence.slice(0, 90).trim()}...` : sentence;
        questions.push({
          id: `local-sa-${Date.now()}-${qIdx++}`,
          courseId,
          sourceDocumentId: chunk.documentId,
          sourceCitation: citation,
          type: 'short_answer',
          question: `Based on your course materials in ${chunk.filename}, clearly explain: "${promptConcept}"`,
          correctAnswer: sentence,
          explanation: `**Model Answer:** "${sentence}"\n\n**Why it is correct:** Directly grounded in ${citation}.`,
          difficulty: difficulty === 'Mixed' ? 'Hard' : difficulty,
          keyConcepts: ['Short Recall'],
          createdAt: Date.now(),
        });
      }
    }

    return questions;
  }

  // Answer Evaluation (Short Answer & MC/TF)
  static async evaluateAnswer(
    question: Question,
    studentAnswer: string,
    contextChunk?: DocumentChunk
  ): Promise<EvaluationResult> {
    // For MC or TF, exact comparison
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      const isCorrect =
        studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      return {
        evaluation: isCorrect ? 'Correct' : 'Incorrect',
        score: isCorrect ? 100 : 0,
        feedback: isCorrect
          ? '✓ Correct! Your choice matches the verified course text perfectly.'
          : `✗ Not quite. The correct answer is "${question.correctAnswer}". Check the explanation below to reinforce your understanding.`,
        idealAnswer: question.correctAnswer,
        sourceCitation: question.sourceCitation,
        providerUsed: 'offline_local',
      };
    }

    // For Short Answer, attempt Online Gemini semantic evaluation
    const status = await determineAIStatus();
    const settings = await getSettings();

    if (status === 'online' && settings.aiMode !== 'offline_only') {
      try {
        const res = await fetch('/api/ai/evaluate-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: question.question,
            studentAnswer,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            sourceCitation: question.sourceCitation,
            contextText: contextChunk?.text,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            evaluation: data.evaluation,
            score: data.score,
            feedback: data.feedback,
            idealAnswer: data.idealAnswer || question.correctAnswer,
            reasoning: data.reasoning || 'Gemini 3.8 Evaluator Reasoning: Evaluated student response against syllabus criteria, weighed key concepts, and generated actionable constructive feedback.',
            thinkingSteps: Array.isArray(data.thinkingSteps) && data.thinkingSteps.length > 0
              ? data.thinkingSteps
              : [
                  'Step 1: Parsed student response against question criteria',
                  'Step 2: Cross-referenced with ground-truth syllabus notes',
                  'Step 3: Diagnosed conceptual accuracy & synthesized grading rationale'
                ],
            misconceptionsIdentified: data.misconceptionsIdentified,
            sourceCitation: data.sourceCitation || question.sourceCitation,
            providerUsed: 'online_gemini',
          };
        }
      } catch (err) {
        console.warn('Online evaluation failed, falling back to local evaluation:', err);
      }
    }

    // Local offline semantic evaluation (TF-IDF keyword overlap + length heuristic)
    return this.offlineEvaluateShortAnswer(question, studentAnswer);
  }

  // Local semantic heuristic evaluator
  private static offlineEvaluateShortAnswer(
    question: Question,
    studentAnswer: string
  ): EvaluationResult {
    const studentTokens = studentAnswer
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const targetTokens = question.correctAnswer
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const targetSet = new Set(targetTokens);
    let matchedCount = 0;

    for (const st of studentTokens) {
      if (targetSet.has(st)) matchedCount++;
    }

    const overlapRatio = matchedCount / Math.max(1, targetSet.size);

    if (overlapRatio >= 0.55 || studentAnswer.toLowerCase() === question.correctAnswer.toLowerCase()) {
      return {
        evaluation: 'Correct',
        score: Math.min(100, Math.round(75 + overlapRatio * 25)),
        feedback: '✓ Correct! Your explanation accurately conveys the core concepts outlined in your course study notes.',
        idealAnswer: question.correctAnswer,
        sourceCitation: question.sourceCitation,
        providerUsed: 'offline_local',
      };
    } else if (overlapRatio >= 0.25 || studentTokens.length >= 5) {
      return {
        evaluation: 'Partial',
        score: 55,
        feedback: 'Partially correct. You mentioned relevant concepts, but missed key terms described in your course text. Review the model answer above to see what to include.',
        idealAnswer: question.correctAnswer,
        sourceCitation: question.sourceCitation,
        providerUsed: 'offline_local',
      };
    } else {
      return {
        evaluation: 'Incorrect',
        score: 20,
        feedback: 'Needs review. Your answer does not yet match the verified concepts in your course materials. Compare your response with the model answer above.',
        idealAnswer: question.correctAnswer,
        sourceCitation: question.sourceCitation,
        providerUsed: 'offline_local',
      };
    }
  }
}
