import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { getDbPool, query } from '../../config/database';
import { getEnv } from '../../config/env';
import { KnowledgeService, type RetrievedIssue } from './knowledge.service';
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
  base64: string;
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
    const apiKey = env.imageLlmProvider === 'groq' ? env.groqApiKey : env.openaiApiKey;
    const baseURL = env.imageLlmProvider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined;

    if (!apiKey) throw new Error(`API key for ${env.imageLlmProvider} is not set`);

    const imageUrl = base64Image.startsWith('data:image/')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;

    let mimeType = 'image/jpeg';
    const match = imageUrl.match(/^data:([^;]+);base64,/);
    if (match) {
      mimeType = match[1];
    }

    const { createOpenAI } = await dynamicImport('@ai-sdk/openai');
    const { generateText } = await dynamicImport('ai');

    const aiProvider = createOpenAI({ apiKey, ...(baseURL ? { baseURL } : {}), fetch });

    try {
      const { text } = await generateText({
        model: aiProvider(env.imageLlmModel),
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this vehicle image. Describe any visible damage, wear, warning lights, or mechanical issues you can see.' },
            {
              type: 'file',
              data: imageUrl,
              mediaType: mimeType,
            },
          ],
        }],
      });
      return text;
    } catch (err) {
      console.error('Image analysis failed:', err);
      return '';
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
    }
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
    if (intakeAnswers) {
      const qas = intakeAnswers.qas || intakeAnswers.answers;
      if (qas && Object.keys(qas).length > 0) {
        previousAnswersContext = `\n\nPrevious questions asked and user's answers:\n${Object.entries(qas).map(([q, a]) => `- Q: ${q}\n  A: ${a}`).join('\n')}`;
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

        // system + user message split for better structured-output compliance on Groq
        const llmRaw = await generateText({
          model: modelInstance,
          system: `You are an expert automotive diagnostic assistant for a ${vehicle.year} ${vehicle.make} ${vehicle.model}.
Your task is to generate EXACTLY 5 follow-up diagnostic questions for the reported symptom.
Step 1 – Identify the single primary vehicle subsystem affected by the symptom (e.g. Windshield Wiper System, Brakes, Battery/Charging, Engine, AC, Transmission, Tyres, Steering/Suspension, Fuel, Electrical).
Step 2 – Generate EXACTLY 5 questions that are specific to that subsystem only. Never mix subsystems unless a previous answer explicitly points to a secondary system.
Rules:
- Every question MUST be directly relevant to the reported symptom and the identified subsystem.
- Never ask generic cross-system questions (e.g., "When do you notice this?" as an accelerating/braking option is ONLY for drivetrain symptoms, NOT for wipers, AC, or electrical faults).
- Never ask about vehicle model/year (already known).
- Each question must have 3–5 concise, mutually exclusive answer options.
- Questions must progressively narrow the diagnosis (start broad within the subsystem, then narrow).
- Return EXACTLY 5 question objects, no more, no less.
- IMPORTANT: You must output ONLY a valid raw JSON object with the following schema, and absolutely NO markdown formatting or other text:
{
  "questions": [
    { "question": "The question text", "options": ["Option 1", "Option 2", "Option 3"] }
  ]
}`,
          messages: [{
            role: 'user',
            content: `Symptom reported: "${symptomText}"${previousAnswersContext}\n\nGenerate exactly 5 diagnostic questions specific to this symptom's subsystem. Return ONLY JSON.`,
          }],
        });

        // Parse the generated text into JSON
        let text = llmRaw.text.trim();
        if (text.startsWith('```json')) text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
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

    // Validate and decode media inputs upfront
    const validatedMedia = mediaInputs.map(input => {
      const matches = input.base64.match(/^data:([A-Za-z0-9+/.-]+);base64,(.+)$/);
      let buffer: Buffer;
      let mime = '';

      if (matches && matches.length === 3) {
        mime = matches[1].toLowerCase();
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(input.base64, 'base64');
        if (input.mediaType === 'image') mime = 'image/jpeg';
        if (input.mediaType === 'audio') mime = 'audio/wav';
        if (input.mediaType === 'video') mime = 'video/mp4';
      }

      const allowedMimes = ALLOWED_MEDIA[input.mediaType];
      if (!allowedMimes) {
        throw new Error(`Unsupported mediaType: ${input.mediaType}`);
      }

      const extension = allowedMimes[mime as keyof typeof allowedMimes];
      if (!extension) {
        throw new Error(`Unsupported or invalid MIME type for ${input.mediaType}: ${mime}`);
      }

      const maxSize = MAX_SIZES[input.mediaType];
      if (buffer.length > maxSize) {
        throw new Error(`File size exceeds the limit of ${maxSize / (1024 * 1024)}MB for ${input.mediaType}`);
      }

      return {
        mediaType: input.mediaType,
        buffer,
        extension,
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

    // 2. Save media files to local disk
    const savedMediaPaths: { mediaType: 'image' | 'video' | 'audio'; url: string }[] = [];
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (const media of validatedMedia) {
      // ponytail: generate unique filename using stdlib
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${media.extension}`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, new Uint8Array(media.buffer));

      savedMediaPaths.push({
        mediaType: media.mediaType,
        url: `/uploads/${filename}`,
      });
    }

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
        mediaInputs
          .filter(m => m.mediaType === 'image')
          .map(m => DiagnosisService.analyzeImage(m.base64))
      ),
      Promise.all(
        mediaInputs
          .filter(m => m.mediaType === 'audio')
          .map(m => DiagnosisService.transcribeAudio(m.base64, 'audio/wav'))
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
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        llmResponseObj = JSON.parse(text);
        
        // Rough validation
        if (!llmResponseObj?.issues || !Array.isArray(llmResponseObj.issues) || typeof llmResponseObj.confidenceScore !== 'number') {
           throw new Error('LLM returned invalid diagnosis structure');
        }
        
        // Normalize nextAction to prevent DB constraint errors
        const allowedNextActions = ['diy', 'bookGarage', 'buyParts'];
        if (!allowedNextActions.includes(llmResponseObj.nextAction)) {
           llmResponseObj.nextAction = 'bookGarage';
        }
        
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
