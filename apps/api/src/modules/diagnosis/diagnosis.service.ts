import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { getDbPool, query } from '../../config/database';
import { getEnv } from '../../config/env';
import { KnowledgeService, type RetrievedIssue } from './knowledge.service';
import dns from 'dns';

// Fix ENOTFOUND errors on some Windows setups where IPv6 fails
dns.setDefaultResultOrder('ipv4first');

// Fallback for CommonJS to use ESM modules without tsc breaking it
const dynamicImport = new Function('specifier', 'return import(specifier)');

// Schema matching frontend requirements and future sprints
export const diagnosisResultSchema = z.object({
  issues: z.array(z.object({
    name: z.string(),
    confidence: z.number().min(0).max(100),
    estimatedPriceRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
    requiredParts: z.array(z.string()),
  })),
  confidenceScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  diyAllowed: z.boolean(),
  diySteps: z.array(z.string()),
  nextAction: z.enum(['diy', 'bookGarage', 'buyParts']),
});

export type DiagnosisResult = z.infer<typeof diagnosisResultSchema>;

export interface MediaInput {
  mediaType: 'image' | 'video' | 'audio';
  url: string;
}

const ALLOWED_MEDIA = {
  image: {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  },
  audio: {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/webm': 'webm',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
  },
  video: {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogg',
    'video/quicktime': 'mov',
  },
} as const;

const MAX_SIZES = {
  image: 10 * 1024 * 1024,   // 10MB
  audio: 15 * 1024 * 1024,   // 15MB
  video: 15 * 1024 * 1024,   // 15MB
} as const;

export class DiagnosisService {
  // ponytail: raw fetch — Vercel AI SDK has no transcription support; both Groq and OpenAI use identical OpenAI-compatible multipart endpoint
  static async transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    const env = getEnv();
    const baseURL = env.audioProvider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : 'https://api.openai.com/v1';
    const apiKey = env.audioProvider === 'groq' ? env.groqApiKey : env.openaiApiKey;

    const rawBase64 = base64Audio.includes(';base64,') ? base64Audio.split(';base64,')[1] : base64Audio;
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(Buffer.from(rawBase64, 'base64'))], { type: mimeType }), 'audio.wav');
    formData.append('model', env.audioModel);
    formData.append('response_format', 'text');

    try {
      const res = await fetch(`${baseURL}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });
      return res.ok ? res.text() : '';
    } catch (err) {
      console.error('Audio transcription failed:', err);
      return '';
    }
  }

  static async analyzeImage(base64Image: string): Promise<string> {
    const env = getEnv();
    // Always use Groq for vision — the vision model is configured separately
    const apiKey = env.groqApiKey;
    const baseURL = 'https://api.groq.com/openai/v1';

    if (!apiKey) throw new Error('GROQ_API_KEY is not set — required for image analysis');

    // Ensure proper data URI prefix for whichever image format was uploaded
    let inferredMime = 'image/jpeg';
    if (base64Image.startsWith('iVBORw')) inferredMime = 'image/png';
    else if (base64Image.startsWith('UklGR')) inferredMime = 'image/webp';
    else if (base64Image.startsWith('R0lGOD')) inferredMime = 'image/gif';

    const imageDataUri = base64Image.startsWith('data:image/')
      ? base64Image
      : `data:${inferredMime};base64,${base64Image}`;

    // Determine actual mime type from data URI
    const mimeMatch = imageDataUri.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    // Use raw fetch with OpenAI-compatible image_url format (required by qwen and most Groq vision models)
    try {
      const payload = {
        model: env.imageLlmModel,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'You are an expert automotive damage inspector. Analyze this vehicle image in detail. Describe: (1) what part of the vehicle is shown, (2) any visible damage, cracks, wear, corrosion, fluid leaks, warning lights, or mechanical issues, (3) the severity of any damage. Be specific and technical. If no damage is visible, say so clearly.'
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUri }
            }
          ]
        }],
        max_tokens: 500,
      };

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[analyzeImage] Vision API error:', response.status, errBody);
        return '';
      }

      const data = await response.json() as any;
      let rawText: string = data?.choices?.[0]?.message?.content ?? '';
      // Strip <think>...</think> reasoning blocks emitted by Qwen/CoT models
      rawText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      console.log('[analyzeImage] Vision analysis result:', rawText.slice(0, 200));
      return rawText;
    } catch (err) {
      console.error('[analyzeImage] Failed:', err);
      return '';
    }
  }

  static async validateImageRelevance(base64Image: string, mimeType: string): Promise<{ isValid: boolean; reason?: string }> {
    const env = getEnv();
    const apiKey = env.imageLlmProvider === 'groq' ? env.groqApiKey : env.openaiApiKey;
    const baseURL = env.imageLlmProvider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined;

    if (!apiKey) {
      return { isValid: false, reason: 'Image validation is temporarily unavailable. Please try again.' };
    }

    const imageUrl = base64Image.startsWith('data:image/')
      ? base64Image
      : `data:image/${mimeType.split('/')[1] || 'jpeg'};base64,${base64Image}`;

    try {
      const { createOpenAI } = await dynamicImport('@ai-sdk/openai');
      const { generateText } = await dynamicImport('ai');

      const aiProvider = createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}), fetch });

      const { text } = await generateText({
        model: aiProvider(env.imageLlmModel),
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Is this an image of a vehicle, car part, dashboard, or something related to automotive diagnostics? Reply ONLY with YES or NO.' },
            {
              type: 'image',
              image: imageUrl,
            },
          ],
        }],
      });

      const isRelevant = text.trim().toUpperCase().includes('YES');
      if (isRelevant) {
        return { isValid: true };
      } else {
        return { isValid: false, reason: 'Image does not appear to be vehicle-related. Please upload a clear photo of the car or issue.' };
      }
    } catch (err) {
      console.error('Image validation failed (fail closed):', err);
      // Fail closed as per strict requirements
      return { isValid: false, reason: 'Image validation is temporarily unavailable. Please try again.' };
    }
  }

  static async getChatHistory(userId: string, vehicleId: string): Promise<any[]> {
    try {
      const res = await query(
        'SELECT messages FROM ai_chat_history WHERE user_id = $1 AND vehicle_id = $2',
        [userId, vehicleId]
      );
      return res.rows.length > 0 ? res.rows[0].messages : [];
    } catch (err) {
      console.error('Failed to get chat history:', err);
      return [];
    }
  }

  static async saveChatHistory(userId: string, vehicleId: string, messages: any[]): Promise<void> {
    try {
      await query(
        `INSERT INTO ai_chat_history (user_id, vehicle_id, messages, updated_at) 
         VALUES ($1, $2, $3, NOW()) 
         ON CONFLICT (user_id, vehicle_id) DO UPDATE SET messages = EXCLUDED.messages, updated_at = NOW()`,
        [userId, vehicleId, JSON.stringify(messages)]
      );
    } catch (err) {
      console.error('Failed to save chat history:', err);
      // Suppress error to avoid breaking the application
    }
  }

  /**
   * Stage 1: Generate dynamic intake questions based on database matches
   */
  static async generateQuestions(
    customerId: string,
    vehicleId: string,
    symptomText: string,
    intakeAnswers?: {
      category?: string;
      answers?: Record<string, string>;
      questions?: string[];
      qas?: Record<string, string>;
    },
    mediaInputs: Array<{ mediaType: string; url: string }> = []
  ) {
    const env = getEnv();

    // Verify vehicle exists and belongs to the customer
    const vehicleRes = await query(
      'SELECT make, model, year FROM vehicles WHERE id = $1 AND customer_id = $2',
      [vehicleId, customerId]
    );

    if (vehicleRes.rows.length === 0) {
      throw new Error('Vehicle not found or does not belong to the user');
    }
    const vehicle = vehicleRes.rows[0];

    // Fetch matching issues from database for grounding
    let matchedIssues: RetrievedIssue[] = [];
    try {
      matchedIssues = await KnowledgeService.findMatchingIssues(
        symptomText,
        vehicle.make,
        vehicle.year
      );
    } catch (dbErr) {
      console.error('Failed to retrieve matched issues from database:', dbErr);
    }
    let previousAnswersContext = '';
    let questionsAskedCount = 0;
    if (intakeAnswers) {
      const qas = intakeAnswers.qas || intakeAnswers.answers;
      if (qas && Object.keys(qas).length > 0) {
        questionsAskedCount = Object.keys(qas).length;
        previousAnswersContext = `\n\nPrevious questions asked and user's answers:\n${Object.entries(qas).map(([q, a]) => `- Q: ${q}\n  A: ${a}`).join('\n')}`;
      }
    }

    if (questionsAskedCount >= 4) {
      return {
        questions: [],
        matchedIssues: matchedIssues.map(issue => ({
          id: issue.id,
          issue_name: issue.issue_name,
          safety_critical: issue.safety_critical,
        })),
      };
    }

    let finalSymptomText = symptomText;

    // Evaluate media if present
    if (mediaInputs && mediaInputs.length > 0) {
      const validatedMedia = mediaInputs.map(input => {
        const relativePath = input.url.replace(/^\//, '');
        const absolutePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(absolutePath)) {
          return {
            mediaType: input.mediaType,
            buffer: fs.readFileSync(absolutePath),
            url: input.url
          };
        }
        return null;
      }).filter(Boolean);

      const [imageDescriptions, audioTranscripts] = await Promise.all([
        Promise.all(
          validatedMedia
            .filter(m => m?.mediaType === 'image')
            .map(m => DiagnosisService.analyzeImage(m!.buffer.toString('base64')))
        ),
        Promise.all(
          validatedMedia
            .filter(m => m?.mediaType === 'audio')
            .map(m => DiagnosisService.transcribeAudio(m!.buffer.toString('base64'), 'audio/wav'))
        ),
      ]);

      const transcriptText = audioTranscripts.filter(Boolean).join('\n');
      if (transcriptText) {
        finalSymptomText = `${finalSymptomText}\n\n[Transcribed Audio]: ${transcriptText}`;
      }

      const imageContext = imageDescriptions.filter(Boolean).length > 0
        ? `\n\nImage Analysis:\n${imageDescriptions.map((d, i) => `- Image #${i + 1}: ${d}`).join('\n')}`
        : '';
        
      finalSymptomText += imageContext;

      // Handle video explicitly to avoid non-automotive rejection for video uploads
      if (validatedMedia.some(m => m?.mediaType === 'video')) {
        finalSymptomText += `\n\n[System Note]: The user uploaded a video. Direct video analysis is unavailable. You MUST acknowledge this by stating: "Video uploaded successfully, but automatic video analysis is unavailable." Then, address any text they provided and ask your follow-up question.`;
      }
    }


    // ── Diagnostic logging helper ──────────────────────────────────────────
    const logLlmAttempt = (attempt: number) => {
      console.log(`[Diagnosis:generateQuestions] LLM attempt ${attempt}`, {
        provider: env.llmProvider,
        model: env.llmModel,
        groqKeyPrefix: env.groqApiKey ? env.groqApiKey.slice(0, 8) + '...' : '(unset)',
        openaiKeyPrefix: env.openaiApiKey ? env.openaiApiKey.slice(0, 8) + '...' : '(unset)',
        symptomTextLength: symptomText.length,
        symptomTextPreview: symptomText.slice(0, 80),
      });
    };

    const logLlmError = (attempt: number, err: unknown) => {
      const e = err as any;
      console.error(`[Diagnosis:generateQuestions] LLM attempt ${attempt} FAILED`, {
        name: e?.name,
        message: e?.message,
        // Vercel AI SDK surfaces these on the error object
        status: e?.status ?? e?.statusCode ?? e?.response?.status,
        errorCode: e?.responseBody ? (() => { try { return JSON.parse(e.responseBody)?.error?.code; } catch { return undefined; } })() : undefined,
        errorType: e?.responseBody ? (() => { try { return JSON.parse(e.responseBody)?.error?.type; } catch { return undefined; } })() : undefined,
        responseBody: e?.responseBody ?? e?.body ?? undefined,
        cause: e?.cause ? String(e.cause) : undefined,
        stack: e?.stack?.split('\n').slice(0, 6).join('\n'),
      });
    };

    // ── LLM call with one automatic retry ─────────────────────────────────
    // Use a plain typed holder to avoid TS errors with Awaited<ReturnType<dynamic import>>
    let llmResultObject: { questions: Array<{ question: string; options: string[] }> } | undefined;
    let lastLlmError: unknown;

    for (let attempt = 1; attempt <= 2; attempt++) {
      logLlmAttempt(attempt);
      try {
        const { createOpenAI } = await dynamicImport('@ai-sdk/openai');
        const { generateText } = await dynamicImport('ai');

        let aiProvider;
        if (env.llmProvider === 'groq') {
          if (!env.groqApiKey) throw new Error('GROQ_API_KEY is not defined');
          aiProvider = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, fetch });
        } else {
          if (!env.openaiApiKey) throw new Error('OPENAI_API_KEY is not defined');
          aiProvider = createOpenAI({ apiKey: env.openaiApiKey, fetch });
        }
        const modelInstance = aiProvider(env.llmModel);

        // Determine if we have media analysis in the context — if so, do NOT trigger non-automotive rejection
        const hasMediaAnalysis = finalSymptomText.includes('Image Analysis:') || finalSymptomText.includes('The user uploaded a video');

        const llmRaw = await generateText({
          model: modelInstance,
          system: `You are an expert automotive diagnostic assistant for a ${vehicle.year} ${vehicle.make} ${vehicle.model}.
Your task is to generate EXACTLY 1 follow-up diagnostic question for the reported symptom, strictly based on the user's previous answers if any exist.

${hasMediaAnalysis
              ? 'Media (image or video) of the vehicle/part has been submitted and the findings or system notes are included in the symptom description below. You MUST first explicitly acknowledge this, state what you observe or need based on the media, and then ask a follow-up question directly relevant to the visible damage or issue. Combine your observation and question into the single "question" string.'
              : `CRITICAL RULE:\n- If the reported symptom is NOT related to automotive issues, vehicles, cars, or driving, you MUST REJECT it. Return EXACTLY 1 question object with the question "I only assess automotive issues. Please describe a vehicle problem." and options ["Understood", "Cancel"].`
            }

Rules:
- The question MUST logically follow from the context of previous answers to actively drill down into the root cause.
- Never ask generic cross-system questions.
- Never ask about vehicle model/year.
- The question must have 3–5 concise, mutually exclusive answer options.
- You must output ONLY a valid raw JSON object with the following schema, and absolutely NO markdown formatting or other text:
{
  "questions": [
    { "question": "The strictly contextual follow-up observation and question text", "options": ["Option 1", "Option 2", "Option 3"] }
  ]
}`,
          messages: [{
            role: 'user',
            content: `Symptom reported: "${finalSymptomText}"${previousAnswersContext}\n\nGenerate exactly 1 logical follow-up question based tightly on the previous answers. Return ONLY JSON.`,
          }],
        });

        // Parse the generated text into JSON
        let text = llmRaw.text.trim();
        // Strip reasoning tags that Qwen models produce
        text = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
        if (text.startsWith('```json')) text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        llmResultObject = JSON.parse(text);

        // Ensure it's roughly the right shape
        if (!llmResultObject?.questions || !Array.isArray(llmResultObject.questions)) {
          throw new Error('LLM did not return a valid questions array');
        }

        console.log(`[Diagnosis:generateQuestions] LLM attempt ${attempt} SUCCESS — received ${llmResultObject.questions.length} questions`);
        break; // success — exit retry loop
      } catch (err) {
        logLlmError(attempt, err);
        lastLlmError = err;
        if (attempt < 2) {
          // Brief pause before retry
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    }

    // ── If both attempts failed, surface a clear unavailability response ───
    if (!llmResultObject) {
      const errMsg = lastLlmError instanceof Error ? lastLlmError.message : 'Unknown LLM error';
      console.error('[Diagnosis:generateQuestions] Both LLM attempts failed. Returning AI-unavailable signal.', { errMsg });
      // Throw so the route returns a proper 500 — never return hardcoded questions
      throw new Error(`AI diagnostic service temporarily unavailable: ${errMsg}`);
    }

    // Map questions to structured objects with unique IDs
    const questionsWithIds = llmResultObject.questions.map((q: { question: string; options: string[] }, idx: number) => ({
      id: `dyn-q-${idx}-${Date.now()}`,
      question: q.question,
      options: q.options,
    }));

    return {
      questions: questionsWithIds,
      matchedIssues: matchedIssues.map(issue => ({
        id: issue.id,
        issue_name: issue.issue_name,
        safety_critical: issue.safety_critical,
      })),
    };
  }

  /**
   * Run the diagnosis engine synchronously:
   * 1. Query vehicle details & recent service history.
   * 2. Save media files to local disk.
   * 3. Send prompt & media context to LLM.
   * 4. Enforce safety guardrails.
   * 5. Save all results inside a DB transaction.
   */
  static async runDiagnosis(
    customerId: string,
    vehicleId: string,
    symptomText: string,
    mediaInputs: MediaInput[] = [],
    intakeAnswers?: {
      category?: string;
      answers?: Record<string, string>;
      questions?: string[];
      qas?: Record<string, string>;
    }
  ) {
    const env = getEnv();

    // Validate and process uploaded media files
    const validatedMedia = mediaInputs.map(input => {
      // The file is already uploaded to the provided url (e.g., /uploads/diagnosis/filename.ext)
      const relativePath = input.url.replace(/^\//, ''); // remove leading slash
      const absolutePath = path.join(process.cwd(), relativePath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Uploaded file not found: ${input.url}`);
      }

      const buffer = fs.readFileSync(absolutePath);
      const ext = path.extname(absolutePath).replace('.', '') || 'tmp';

      return {
        mediaType: input.mediaType,
        buffer,
        extension: ext,
        url: input.url
      };
    });

    // 1. Fetch vehicle and verify customer ownership
    const vehicleRes = await query(
      'SELECT make, model, year, mileage FROM vehicles WHERE id = $1 AND customer_id = $2',
      [vehicleId, customerId]
    );

    if (vehicleRes.rows.length === 0) {
      throw new Error('Vehicle not found or does not belong to the user');
    }
    const vehicle = vehicleRes.rows[0];

    // Fetch service history and matching issues in parallel
    const [historyRes, matchedIssuesResult] = await Promise.all([
      query(
        'SELECT service_date, description, cost FROM vehicle_service_history WHERE vehicle_id = $1 ORDER BY service_date DESC LIMIT 5',
        [vehicleId]
      ),
      KnowledgeService.findMatchingIssues(
        symptomText,
        vehicle.make,
        vehicle.year,
        intakeAnswers?.category
      ).catch(dbErr => {
        console.error('Failed to retrieve matched issues from database:', dbErr);
        return [];
      })
    ]);

    const serviceHistory = historyRes.rows;
    let matchedIssues = matchedIssuesResult;

    // 2. We already have the media saved to disk via /upload-media.
    // We just map the URLs.
    const savedMediaPaths: { mediaType: 'image' | 'video' | 'audio'; url: string }[] = validatedMedia.map(m => ({
      mediaType: m.mediaType,
      url: m.url
    }));

    let result: DiagnosisResult;
    let finalSymptomText = symptomText;

    // 3. Call LLM (Vercel AI SDK OpenAI or Groq)
    let llmResponseObj: any = null;
    let retries = 1;
    let lastError: any = null;

    while (retries >= 0) {
      try {
        const { createOpenAI } = await dynamicImport('@ai-sdk/openai');
        const { generateText } = await dynamicImport('ai');

        let aiProvider;
        if (env.llmProvider === 'groq') {
          if (!env.groqApiKey) throw new Error('GROQ_API_KEY is not defined');
          aiProvider = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, fetch });
        } else {
          if (!env.openaiApiKey) throw new Error('OPENAI_API_KEY is not defined');
          aiProvider = createOpenAI({ apiKey: env.openaiApiKey, fetch });
        }
        const modelInstance = aiProvider(env.llmModel);

        let intakeText = '';
        if (intakeAnswers) {
          const qas = intakeAnswers.qas || intakeAnswers.answers;
          if (qas && Object.keys(qas).length > 0) {
            intakeText = `\nIntake Answers:\n${Object.entries(qas).map(([q, a]) => `- ${q}: ${a}`).join('\n')}`;
          }
        }

        // Process media in parallel before LLM call
        const [imageDescriptions, audioTranscripts] = await Promise.all([
          Promise.all(
            validatedMedia
              .filter(m => m.mediaType === 'image')
              .map(m => DiagnosisService.analyzeImage(m.buffer.toString('base64')))
          ),
          Promise.all(
            validatedMedia
              .filter(m => m.mediaType === 'audio')
              .map(m => DiagnosisService.transcribeAudio(m.buffer.toString('base64'), 'audio/wav'))
          ),
        ]);

        // Append transcripts to symptomText so they persist to DB too
        const transcriptText = audioTranscripts.filter(Boolean).join('\n');
        finalSymptomText = transcriptText
          ? `${symptomText}\n\n[Transcribed Audio]: ${transcriptText}`
          : symptomText;

        // Build image context for prompt
        const imageContext = imageDescriptions.filter(Boolean).length > 0
          ? `\n\nImage Analysis:\n${imageDescriptions.map((d, i) => `- Image #${i + 1}: ${d}`).join('\n')}`
          : '';

        finalSymptomText += imageContext;

        // Handle video explicitly in final diagnosis
        if (validatedMedia.some(m => m.mediaType === 'video')) {
          finalSymptomText += `\n\n[System Note]: The user uploaded a video, but direct video analysis is currently unavailable. Base your diagnosis on the user's description and answers.`;
        }

        // Format service history for the prompt
        const serviceHistoryText = serviceHistory.length > 0
          ? serviceHistory.map(h => `- [${new Date(h.service_date).toLocaleDateString()}] ${h.description} ($${h.cost || 0})`).join('\n')
          : 'No prior service history recorded.';

        const userPrompt = `Vehicle Context:
- Make: ${vehicle.make}
- Model: ${vehicle.model}
- Year: ${vehicle.year}
- Mileage: ${vehicle.mileage} miles

Prior Service History:
${serviceHistoryText}

Reported Symptoms:
${finalSymptomText}
${intakeText}

Please diagnose the issue.`;

        const contentPayload: { type: 'text'; text: string }[] = [{ type: 'text', text: userPrompt + imageContext }];


        const systemPrompt = `You are WrectifAI, an advanced automotive diagnostic expert system.
Analyze the vehicle details, recent service history, user symptoms, and any provided media descriptions.

CRITICAL REASONING & ANTI-HALLUCINATION RULES:
- You MUST evaluate ALL collected evidence together (original symptom, follow-up questions, and additional user input).
- If the user's reported symptom or input is NOT related to automotive issues, vehicles, cars, or driving, you MUST REJECT it. In this case, return exactly 1 issue named "Non-Automotive Query", set confidenceScore to 0, riskLevel to "low", diyAllowed to false, and in diySteps state exactly: "I only assess with automotive issues." Do NOT generate any fake automotive data.
- When additional information is provided, reconsider all available evidence and update the diagnosis logically. Do not discard previous reasoning; the new information must refine the diagnosis, not restart it.
- The diagnosis MUST be generated ONLY from the provided information. Do NOT invent facts, assume user responses, or hallucinate observations.
- Every statement in the diagnosis must be supported by the collected conversation.
- NEVER mention: recent servicing, replaced parts, warning lights, noises, leaks, smoke, or vibrations UNLESS the user explicitly reported them.

DIAGNOSIS REQUIREMENTS:
- Generate a ranked differential diagnosis, not just a single guess.
- The confidence score must be calculated dynamically, reflecting the completeness of evidence, consistency of symptoms, and certainty of the diagnosis. Do not use fixed confidence values.
- If information is insufficient, reduce the confidence score and explain what additional information is needed.
- Severity must be determined dynamically based on the safety risk of the collected information. Do not use fixed severity levels.

Provide a highly structured professional AI diagnosis conforming exactly to the required JSON schema.
The diagnosis MUST contain:
1. Probable Diagnosis (set this as the first issue in the 'issues' array).
2. Confidence % (populate 'confidenceScore' and the 'confidence' field of the first issue).
3. Severity (populate 'riskLevel').
4. Diagnosis Summary (include this as the first item in the 'diySteps' array, labeled exactly as "Diagnosis Summary:"). Reconsider all available evidence and explain why this diagnosis was reached based STRICTLY on the user's actual answers. If new information changed the ranking, explain why.
5. Ranked Possible Causes (include these as additional issues in the 'issues' array, ordered by likelihood). Explain why each alternative is considered based on the user's actual answers.
6. Recommended Repairs (include this as the second item in the 'diySteps' array, labeled exactly as "Recommended Repairs:"). Generate repair recommendations based on the diagnosis.
7. Safety Advice (include this as the third item in the 'diySteps' array, labeled exactly as "Safety Advice:"). Generate safety guidance dynamically. If the issue could affect safe vehicle operation, clearly communicate that. If it is safe to continue driving with caution, communicate that appropriately.

DIY & SERVICE CATEGORY:
Decide the correct DIY category dynamically based on safety, complexity, and whether safe owner-level actions exist:
- "repair": Safe to repair by a typical owner. Set diyAllowed = true.
- "troubleshooting": Safe software or visual troubleshooting steps exist. Set diyAllowed = true.
- "none": Requires professional inspection or safety-critical work. Set diyAllowed = false.
Always include the chosen category as the fourth item in the 'diySteps' array, exactly labeled as "DIY Category: repair", "DIY Category: troubleshooting", or "DIY Category: none".
If appropriate, generate safe DIY steps as additional items in the 'diySteps' array. If not appropriate, clearly state: "DIY instructions are unavailable because professional inspection is recommended." as the final item in the 'diySteps' array. Do not fabricate DIY instructions.
Always output prices in US dollars.

IMPORTANT: You must output ONLY a valid raw JSON object matching the required schema, and absolutely NO markdown formatting or other text.
The required JSON schema is:
{
  "issues": [
    {
      "name": "string",
      "category": "string (e.g., engine, body, electrical, brake, battery, tire, hvac)",
      "confidence": "number (0-100)",
      "estimatedPriceRange": { "min": "number", "max": "number" },
      "requiredParts": ["string"]
    }
  ],
  "confidenceScore": "number (0-100)",
  "riskLevel": "string (low, medium, high, critical)",
  "diyAllowed": "boolean",
  "diySteps": ["string"],
  "nextAction": "string (diy, bookGarage, buyParts)"
}`;

        const finalSystemPrompt = systemPrompt;
        const llmRaw = await generateText({
          model: modelInstance,
          system: finalSystemPrompt,
          messages: [
            {
              role: 'user',
              content: contentPayload,
            },
          ],
        });

        let text = llmRaw.text.trim();
        // Strip reasoning tags that Qwen models produce
        text = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        llmResponseObj = JSON.parse(text);

        // Rough validation
        if (!llmResponseObj?.issues || !Array.isArray(llmResponseObj.issues)) {
          throw new Error('LLM returned invalid diagnosis structure');
        }
        
        // Coerce confidenceScore to number
        if (typeof llmResponseObj.confidenceScore === 'string') {
          llmResponseObj.confidenceScore = parseInt(llmResponseObj.confidenceScore, 10);
        }
        if (isNaN(llmResponseObj.confidenceScore)) {
          llmResponseObj.confidenceScore = 80;
        }

        // Normalize nextAction to prevent DB constraint errors
        const allowedNextActions = ['diy', 'bookGarage', 'buyParts'];
        if (!allowedNextActions.includes(llmResponseObj.nextAction)) {
          llmResponseObj.nextAction = 'bookGarage';
        }
        // Normalize riskLevel to lower case for DB constraint
        if (llmResponseObj.riskLevel && typeof llmResponseObj.riskLevel === 'string') {
          llmResponseObj.riskLevel = llmResponseObj.riskLevel.toLowerCase();
        }
        // Ensure diyAllowed is boolean
        llmResponseObj.diyAllowed = llmResponseObj.diyAllowed === true || llmResponseObj.diyAllowed === 'true';

        break; // Success, exit retry loop
      } catch (err) {
        console.error(`LLM generation failed (retries left: ${retries}):`, err);
        lastError = err;
        if (retries === 0) {
          throw new Error(`AI diagnostic service temporarily unavailable: ${err instanceof Error ? err.message : 'Unknown LLM error'}`);
        }
        retries--;
      }
    }

    if (!llmResponseObj) {
      throw new Error(`Failed to generate LLM response: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    }
    result = DiagnosisService.applySafetyGuardrail(llmResponseObj, symptomText, matchedIssues);

    // 5. Database Transaction Persistence
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert Request
      const requestInsertRes = await client.query(
        `INSERT INTO diagnosis_requests (customer_id, vehicle_id, symptom_text, status)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [customerId, vehicleId, finalSymptomText, 'completed']
      );
      const dbRequest = requestInsertRes.rows[0];

      // Insert Media records
      const dbMediaList = [];
      for (const mediaPath of savedMediaPaths) {
        const mediaInsertRes = await client.query(
          `INSERT INTO diagnosis_media (diagnosis_request_id, media_type, url)
           VALUES ($1, $2, $3) RETURNING *`,
          [dbRequest.id, mediaPath.mediaType, mediaPath.url]
        );
        dbMediaList.push(mediaInsertRes.rows[0]);
      }

      // Insert Result
      const resultInsertRes = await client.query(
        `INSERT INTO diagnosis_results (diagnosis_request_id, issues, confidence_score, risk_level, diy_allowed, diy_steps, next_action)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          dbRequest.id,
          JSON.stringify(result.issues),
          result.confidenceScore,
          result.riskLevel,
          result.diyAllowed,
          result.diySteps,
          result.nextAction,
        ]
      );
      const dbResult = resultInsertRes.rows[0];

      // Add idempotently to Service History
      // ON CONFLICT uses the unique index we created for diagnosis_request_id
      const mainIssueTitle = result.issues && result.issues.length > 0 ? result.issues[0].name : 'AI Diagnosis';
      await client.query(
        `INSERT INTO vehicle_service_history (vehicle_id, service_date, description, cost, diagnosis_request_id)
         VALUES ($1, NOW(), $2, 0, $3)
         ON CONFLICT (diagnosis_request_id) DO NOTHING`,
        [dbRequest.vehicle_id, `AI Diagnosis: ${mainIssueTitle}`, dbRequest.id]
      );

      await client.query('COMMIT');

      return {
        id: dbRequest.id,
        customerId: dbRequest.customer_id,
        vehicleId: dbRequest.vehicle_id,
        symptomText: dbRequest.symptom_text,
        status: dbRequest.status,
        createdAt: dbRequest.created_at,
        media: dbMediaList,
        result: {
          id: dbResult.id,
          issues: dbResult.issues,
          confidenceScore: dbResult.confidence_score,
          riskLevel: dbResult.risk_level,
          diyAllowed: dbResult.diy_allowed,
          diySteps: dbResult.diy_steps,
          nextAction: dbResult.next_action,
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get single diagnosis request and result details
   */
  static async getDiagnosisById(diagnosisId: string, customerId: string) {
    // Ownership verification built directly into the query
    const queryStr = `SELECT dr.*, dr.customer_id as "customerId", dr.vehicle_id as "vehicleId", dr.symptom_text as "symptomText",
              dr.created_at as "createdAt",
              dr.status,
              dr.id as id
       FROM diagnosis_requests dr
       WHERE dr.id = $1 AND dr.customer_id = $2`;

    const params = [diagnosisId, customerId];
    const reqRes = await query(queryStr, params);

    if (reqRes.rows.length === 0) {
      return null;
    }
    const dbRequest = reqRes.rows[0];

    // Fetch media
    const mediaRes = await query(
      'SELECT id, media_type as "mediaType", url FROM diagnosis_media WHERE diagnosis_request_id = $1',
      [diagnosisId]
    );

    // Fetch results
    const resultRes = await query(
      `SELECT id, issues, confidence_score as "confidenceScore", risk_level as "riskLevel",
              diy_allowed as "diyAllowed", diy_steps as "diySteps", next_action as "nextAction"
       FROM diagnosis_results
       WHERE diagnosis_request_id = $1`,
      [diagnosisId]
    );

    return {
      id: dbRequest.id,
      customerId: dbRequest.customerId,
      vehicleId: dbRequest.vehicleId,
      symptomText: dbRequest.symptomText,
      status: dbRequest.status,
      createdAt: dbRequest.createdAt,
      media: mediaRes.rows,
      result: resultRes.rows[0] ? {
        id: resultRes.rows[0].id,
        issues: resultRes.rows[0].issues,
        confidenceScore: resultRes.rows[0].confidenceScore,
        riskLevel: resultRes.rows[0].riskLevel,
        diyAllowed: resultRes.rows[0].diyAllowed,
        diySteps: resultRes.rows[0].diySteps,
        nextAction: resultRes.rows[0].nextAction,
      } : null,
    };
  }

  /**
   * Free-form chat with the AI assistant
   */
  static async chat(customerId: string, vehicleId: string, conversationHistory: Array<{ role: string, content: string }>) {
    const vehicleRes = await query('SELECT make, model, year FROM vehicles WHERE id = $1 AND customer_id = $2', [vehicleId, customerId]);
    if (vehicleRes.rows.length === 0) {
      throw new Error('Vehicle not found or does not belong to the user');
    }
    const vehicle = vehicleRes.rows[0];
    const env = getEnv();

    const { createOpenAI } = await dynamicImport('@ai-sdk/openai');
    const { generateText } = await dynamicImport('ai');

    let aiProvider;
    if (env.llmProvider === 'groq') {
      if (!env.groqApiKey) throw new Error('GROQ_API_KEY is not defined');
      aiProvider = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, fetch });
    } else {
      if (!env.openaiApiKey) throw new Error('OPENAI_API_KEY is not defined');
      aiProvider = createOpenAI({ apiKey: env.openaiApiKey, fetch });
    }
    const modelInstance = aiProvider(env.llmModel);

    const systemPrompt = `You are WrectifAI, an expert automotive diagnostic assistant. The user is currently diagnosing a ${vehicle.year} ${vehicle.make} ${vehicle.model}. 
You must act as a highly intelligent mechanic. Crucially, your follow-up questions MUST be strictly based on the user's PREVIOUS answers to drill down logically into the root cause. Do NOT ask generic predefined questions. Use the context of what they just said to formulate the next logical diagnostic step. Be concise and helpful.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ];

    const { text } = await generateText({
      model: modelInstance,
      messages: messages as any,
    });

    return { text };
  }

  /**
   * Apply hardcoded safety guardrails to LLM result
   */
  static applySafetyGuardrail(
    result: DiagnosisResult,
    symptomText: string,
    matchedIssues: RetrievedIssue[] = []
  ): DiagnosisResult {
    // ponytail: compile regex once with word boundaries to prevent false positives (like "absent" matching "abs")
    const safetyRegex = /\b(brake|steering|airbag|suspension|high-voltage|hybrid_battery|hybrid battery|stabilizer|abs)\b/i;
    let hasSafetyCriticalIssue = result.issues.some(issue => safetyRegex.test(issue.name)) ||
      safetyRegex.test(symptomText);

    if (matchedIssues.some(issue => issue.safety_critical)) {
      hasSafetyCriticalIssue = true;
    }

    const finalResult = { ...result };
    if (
      finalResult.riskLevel === 'medium' ||
      finalResult.riskLevel === 'high' ||
      finalResult.riskLevel === 'critical' ||
      hasSafetyCriticalIssue
    ) {
      finalResult.diyAllowed = false;
      finalResult.nextAction = 'bookGarage';
    }
    return finalResult;
  }
}
