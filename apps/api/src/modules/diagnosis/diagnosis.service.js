"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosisService = exports.diagnosisResultSchema = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zod_1 = require("zod");
const database_1 = require("../../config/database");
const env_1 = require("../../config/env");
const knowledge_service_1 = require("./knowledge.service");
// Schema matching frontend requirements and future sprints
exports.diagnosisResultSchema = zod_1.z.object({
    issues: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        confidence: zod_1.z.number().min(0).max(100),
        estimatedPriceRange: zod_1.z.object({
            min: zod_1.z.number(),
            max: zod_1.z.number(),
        }),
        requiredParts: zod_1.z.array(zod_1.z.string()),
    })),
    confidenceScore: zod_1.z.number().min(0).max(100),
    riskLevel: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    diyAllowed: zod_1.z.boolean(),
    diySteps: zod_1.z.array(zod_1.z.string()),
    nextAction: zod_1.z.enum(['diy', 'bookGarage', 'buyParts']),
});
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
};
const MAX_SIZES = {
    image: 10 * 1024 * 1024, // 10MB
    audio: 15 * 1024 * 1024, // 15MB
    video: 15 * 1024 * 1024, // 15MB
};
class DiagnosisService {
    // ponytail: raw fetch — Vercel AI SDK has no transcription support; both Groq and OpenAI use identical OpenAI-compatible multipart endpoint
    static async transcribeAudio(base64Audio, mimeType) {
        const env = (0, env_1.getEnv)();
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
        }
        catch (err) {
            console.error('Audio transcription failed:', err);
            return '';
        }
    }
    static async analyzeImage(base64Image) {
        const { generateText } = await import('ai');
        const { createOpenAI } = await import('@ai-sdk/openai');
        const env = (0, env_1.getEnv)();
        const apiKey = env.imageLlmProvider === 'groq' ? env.groqApiKey : env.openaiApiKey;
        const baseURL = env.imageLlmProvider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined;
        if (!apiKey)
            throw new Error(`API key for ${env.imageLlmProvider} is not set`);
        const imageUrl = base64Image.startsWith('data:image/')
            ? base64Image
            : `data:image/jpeg;base64,${base64Image}`;
        let mimeType = 'image/jpeg';
        const match = imageUrl.match(/^data:([^;]+);base64,/);
        if (match) {
            mimeType = match[1];
        }
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
        }
        catch (err) {
            console.error('Image analysis failed:', err);
            return '';
        }
    }
    static async chatWithLLM(customerId, vehicleId, conversationHistory) {
        const env = (0, env_1.getEnv)();
        const vehicleRes = await (0, database_1.query)('SELECT make, model, year FROM vehicles WHERE id = $1 AND customer_id = $2', [vehicleId, customerId]);
        if (vehicleRes.rows.length === 0) {
            throw new Error('Vehicle not found or does not belong to the user');
        }
        const vehicle = vehicleRes.rows[0];
        const { generateObject } = await import('ai');
        const { createOpenAI } = await import('@ai-sdk/openai');
        let aiProvider;
        if (env.llmProvider === 'groq') {
            if (!env.groqApiKey)
                throw new Error('GROQ_API_KEY is not defined');
            aiProvider = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, fetch });
        }
        else {
            if (!env.openaiApiKey)
                throw new Error('OPENAI_API_KEY is not defined');
            aiProvider = createOpenAI({ apiKey: env.openaiApiKey, fetch });
        }
        const modelInstance = aiProvider(env.llmModel);
        const systemPrompt = `You are WrectifAI, an expert automotive diagnostic assistant.
The user is driving a ${vehicle.year} ${vehicle.make} ${vehicle.model}.
Your goal is to gather enough symptoms and operating conditions to diagnose the car's issue.
Ask exactly ONE concise clarifying question based on the conversation history.
If you determine that you have enough information (a clear symptom and its operating conditions/context) to perform a diagnosis, set "sufficient" to true and leave "followUpQuestion" empty.
Do NOT ask generic questions. Do NOT repeat questions.`;
        try {
            const llmResponse = await generateObject({
                model: modelInstance,
                schema: zod_1.z.object({
                    sufficient: zod_1.z.boolean(),
                    followUpQuestion: zod_1.z.string().optional(),
                }),
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content }))
                ],
            });
            return llmResponse.object;
        }
        catch (err) {
            console.error('LLM chat failed:', err);
            // Fallback to ask for more info instead of short-circuiting to sufficient: true
            return {
                sufficient: false,
                followUpQuestion: `I'm having trouble analyzing the specifics. Can you tell me more about when you notice this happening with your ${vehicle.make}?`
            };
        }
    }
    /**
     * Stage 1: Generate dynamic intake questions based on database matches
     */
    static async generateQuestions(customerId, vehicleId, symptomText, intakeAnswers) {
        const env = (0, env_1.getEnv)();
        // Verify vehicle exists and belongs to the customer
        const vehicleRes = await (0, database_1.query)('SELECT make, model, year FROM vehicles WHERE id = $1 AND customer_id = $2', [vehicleId, customerId]);
        if (vehicleRes.rows.length === 0) {
            throw new Error('Vehicle not found or does not belong to the user');
        }
        const vehicle = vehicleRes.rows[0];
        // Fetch matching issues from database for grounding
        let matchedIssues = [];
        try {
            matchedIssues = await knowledge_service_1.KnowledgeService.findMatchingIssues(symptomText, vehicle.make, vehicle.year);
        }
        catch (dbErr) {
            console.error('Failed to retrieve matched issues from database:', dbErr);
        }
        let previousAnswersContext = '';
        if (intakeAnswers) {
            const qas = intakeAnswers.qas || intakeAnswers.answers;
            if (qas && Object.keys(qas).length > 0) {
                previousAnswersContext = `\n\nPrevious questions asked and user's answers:\n${Object.entries(qas).map(([q, a]) => `- Q: ${q}\n  A: ${a}`).join('\n')}`;
            }
        }
        const systemPrompt = `You are an expert automotive diagnostic assistant.
The user has reported a symptom: "${symptomText}".${previousAnswersContext}

Your task is to generate exactly 5 concise follow-up questions to ask the user. They must form a complete diagnostic interview that progressively narrows down the issue like an experienced mechanic.
First, internally identify the primary affected vehicle subsystem from the user's primary symptom (e.g. Tyres, Brakes, Battery, Charging, Engine Cooling, Engine, Transmission, Steering, Suspension, Fuel, Electrical, AC, etc.).
Ask ALL follow-up questions only within that subsystem. Never ask unrelated cross-system questions unless previous answers provide strong evidence that another subsystem is involved.
Generate the questions using the original symptom, vehicle details, and only the information required to narrow the diagnosis.
Every next question must depend on the original symptom, vehicle details and all previous answers to eliminate the most likely causes.
Each question must be relevant, evidence-based and help narrow the diagnosis.
Never ask unrelated or repeated questions (e.g. AC for tyre pressure).
Use conversation context to avoid repeated or contradictory questions.
The next question should reduce diagnostic uncertainty.
Do not ask generic questions (e.g. "what model is your car?"). Focus strictly on symptoms, sound patterns, warning lights, or operating conditions related to the potential issues.
Provide 3 to 5 concise multiple choice options for each question (e.g., ["Crank is slow", "Starter clicks only", "No crank at all"]).
Output your response as a strict JSON array under a "questions" field containing exactly 5 objects with "question" (string) and "options" (array of strings).`;
        let llmResponse;
        try {
            const { generateObject } = await import('ai');
            const { createOpenAI } = await import('@ai-sdk/openai');
            let aiProvider;
            if (env.llmProvider === 'groq') {
                if (!env.groqApiKey)
                    throw new Error('GROQ_API_KEY is not defined');
                aiProvider = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, fetch });
            }
            else {
                if (!env.openaiApiKey)
                    throw new Error('OPENAI_API_KEY is not defined');
                aiProvider = createOpenAI({ apiKey: env.openaiApiKey, fetch });
            }
            const modelInstance = aiProvider(env.llmModel);
            llmResponse = await generateObject({
                model: modelInstance,
                schema: zod_1.z.object({
                    questions: zod_1.z.array(zod_1.z.object({
                        question: zod_1.z.string(),
                        options: zod_1.z.array(zod_1.z.string()),
                    })),
                }),
                prompt: systemPrompt,
            });
        }
        catch (err) {
            console.error('LLM generation failed:', err);
            return {
                questions: [
                    {
                        question: "When exactly do you notice this issue occurring?",
                        options: ["Only when starting", "While accelerating", "While braking", "All the time"]
                    },
                    {
                        question: "Are there any other symptoms accompanying this?",
                        options: ["Strange noises", "Vibrations or shaking", "Warning lights", "No other symptoms"]
                    }
                ],
                matchedIssues: matchedIssues.map(issue => ({
                    id: issue.id,
                    issue_name: issue.issue_name,
                    safety_critical: issue.safety_critical,
                })),
            };
        }
        // ponytail: map dynamic questions to clean structured objects with dynamic IDs
        const questionsWithIds = llmResponse.object.questions.map((q, idx) => ({
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
    static async runDiagnosis(customerId, vehicleId, symptomText, mediaInputs = [], intakeAnswers) {
        const env = (0, env_1.getEnv)();
        // Validate and decode media inputs upfront
        const validatedMedia = mediaInputs.map(input => {
            const matches = input.base64.match(/^data:([A-Za-z0-9+/.-]+);base64,(.+)$/);
            let buffer;
            let mime = '';
            if (matches && matches.length === 3) {
                mime = matches[1].toLowerCase();
                buffer = Buffer.from(matches[2], 'base64');
            }
            else {
                buffer = Buffer.from(input.base64, 'base64');
                if (input.mediaType === 'image')
                    mime = 'image/jpeg';
                if (input.mediaType === 'audio')
                    mime = 'audio/wav';
                if (input.mediaType === 'video')
                    mime = 'video/mp4';
            }
            const allowedMimes = ALLOWED_MEDIA[input.mediaType];
            if (!allowedMimes) {
                throw new Error(`Unsupported mediaType: ${input.mediaType}`);
            }
            const extension = allowedMimes[mime];
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
        const vehicleRes = await (0, database_1.query)('SELECT make, model, year, mileage FROM vehicles WHERE id = $1 AND customer_id = $2', [vehicleId, customerId]);
        if (vehicleRes.rows.length === 0) {
            throw new Error('Vehicle not found or does not belong to the user');
        }
        const vehicle = vehicleRes.rows[0];
        // Fetch service history and matching issues in parallel
        const [historyRes, matchedIssuesResult] = await Promise.all([
            (0, database_1.query)('SELECT service_date, description, cost FROM vehicle_service_history WHERE vehicle_id = $1 ORDER BY service_date DESC LIMIT 5', [vehicleId]),
            knowledge_service_1.KnowledgeService.findMatchingIssues(symptomText, vehicle.make, vehicle.year, intakeAnswers?.category).catch(dbErr => {
                console.error('Failed to retrieve matched issues from database:', dbErr);
                return [];
            })
        ]);
        const serviceHistory = historyRes.rows;
        let matchedIssues = matchedIssuesResult;
        // 2. Save media files to local disk
        const savedMediaPaths = [];
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
        let result;
        let finalSymptomText = symptomText;
        // 3. Call LLM (Vercel AI SDK OpenAI or Groq)
        let llmResponse;
        let retries = 1;
        while (retries >= 0) {
            try {
                const { generateObject } = await import('ai');
                const { createOpenAI } = await import('@ai-sdk/openai');
                let aiProvider;
                if (env.llmProvider === 'groq') {
                    if (!env.groqApiKey)
                        throw new Error('GROQ_API_KEY is not defined');
                    aiProvider = createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: env.groqApiKey, fetch });
                }
                else {
                    if (!env.openaiApiKey)
                        throw new Error('OPENAI_API_KEY is not defined');
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
                    Promise.all(mediaInputs
                        .filter(m => m.mediaType === 'image')
                        .map(m => DiagnosisService.analyzeImage(m.base64))),
                    Promise.all(mediaInputs
                        .filter(m => m.mediaType === 'audio')
                        .map(m => DiagnosisService.transcribeAudio(m.base64, 'audio/wav'))),
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
                const contentPayload = [{ type: 'text', text: userPrompt + imageContext }];
                const systemPrompt = `You are WrectifAI, an advanced automotive diagnostic expert system.
Analyze the vehicle details, recent service history, user symptoms, and any provided media descriptions.
You must reason over the complete conversation and ALL user answers, not simply combine or restate them. Do NOT rely on the initial symptom or database matches alone.
The diagnosis must be specific and evidence-based. Avoid generic issue names. The diagnosis should identify the most probable component or system responsible based on the complete interview.
The diagnosis must sound like an experienced mechanic explaining the reasoning, not a generic AI summary or a restatement of the user's answers.

Provide a highly structured professional AI diagnosis conforming exactly to the required JSON schema.
The diagnosis MUST contain:
1. Most likely issue (set this as the first issue in the 'issues' array. Make it specific, not generic).
2. Confidence % (populate 'confidenceScore' and the 'confidence' field of the first issue).
3. Severity (populate 'riskLevel').
4. Why this diagnosis? (include this as the first item in the 'diySteps' array, clearly labeled as "Why this diagnosis?:"). Provide a clear, natural, customer-friendly explanation of how the AI reached its conclusion based on the complete interview. Preserve exactly the same meaning and evidence but sound like a helpful AI explaining its conclusion based on the user's answers rather than a technical report.
5. Ranked alternative possible causes (include these as additional issues in the 'issues' array, ordered by likelihood).
6. Recommended inspection or confirmation steps (include this as the second item in the 'diySteps' array, clearly labeled as "Recommended Next Inspection:").

Decide the correct DIY category dynamically based on safety, complexity, and whether safe owner-level actions exist:
- "repair": Use ONLY when the issue can realistically be repaired safely by a typical owner without specialised tools or advanced mechanical knowledge. Set diyAllowed = true.
- "troubleshooting": Use when the issue should not be repaired by the user but there are safe software or visual troubleshooting steps that may resolve or isolate the problem without opening components. Set diyAllowed = true. (Prefer this over "none" if safe checks exist).
- "none": Use ONLY for issues requiring professional tools, advanced diagnostics, disassembly, or safety-critical work (brakes, steering, high-voltage). Set diyAllowed = false.
Always include the chosen category as the third item in the 'diySteps' array, exactly labeled as "DIY Category: repair", "DIY Category: troubleshooting", or "DIY Category: none".
If the category is "repair" or "troubleshooting", generate the appropriate steps, time, tools (or things to verify), and expected outcome as additional items in the 'diySteps' array. Do NOT generate repair instructions if the category is "troubleshooting".
Always output prices in US dollars.`;
                const finalSystemPrompt = systemPrompt;
                llmResponse = await generateObject({
                    model: modelInstance,
                    schema: exports.diagnosisResultSchema,
                    system: finalSystemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: contentPayload,
                        },
                    ],
                });
                break; // Success, exit retry loop
            }
            catch (err) {
                console.error(`LLM generation failed (retries left: ${retries}):`, err);
                if (retries === 0) {
                    // Fallback to a valid JSON response matching the schema
                    llmResponse = {
                        object: {
                            issues: [
                                {
                                    name: `Potential issue related to: ${symptomText.substring(0, 30)}...`,
                                    confidence: 40,
                                    estimatedPriceRange: { min: 50, max: 200 },
                                    requiredParts: []
                                }
                            ],
                            confidenceScore: 40,
                            riskLevel: 'medium',
                            diyAllowed: false,
                            diySteps: [
                                'Why this diagnosis?: The AI was unable to generate a conclusive diagnosis from the provided details, but it seems related to your described symptoms.',
                                'Recommended Next Inspection: Please book a professional inspection so a mechanic can accurately diagnose the issue.'
                            ],
                            nextAction: 'bookGarage'
                        }
                    };
                    break;
                }
                retries--;
            }
        }
        if (!llmResponse) {
            throw new Error('Failed to generate LLM response');
        }
        result = DiagnosisService.applySafetyGuardrail(llmResponse.object, symptomText, matchedIssues);
        // 5. Database Transaction Persistence
        const pool = (0, database_1.getDbPool)();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Insert Request
            const requestInsertRes = await client.query(`INSERT INTO diagnosis_requests (customer_id, vehicle_id, symptom_text, status)
         VALUES ($1, $2, $3, $4) RETURNING *`, [customerId, vehicleId, finalSymptomText, 'completed']);
            const dbRequest = requestInsertRes.rows[0];
            // Insert Media records
            const dbMediaList = [];
            for (const mediaPath of savedMediaPaths) {
                const mediaInsertRes = await client.query(`INSERT INTO diagnosis_media (diagnosis_request_id, media_type, url)
           VALUES ($1, $2, $3) RETURNING *`, [dbRequest.id, mediaPath.mediaType, mediaPath.url]);
                dbMediaList.push(mediaInsertRes.rows[0]);
            }
            // Insert Result
            const resultInsertRes = await client.query(`INSERT INTO diagnosis_results (diagnosis_request_id, issues, confidence_score, risk_level, diy_allowed, diy_steps, next_action)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [
                dbRequest.id,
                JSON.stringify(result.issues),
                result.confidenceScore,
                result.riskLevel,
                result.diyAllowed,
                result.diySteps,
                result.nextAction,
            ]);
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
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get single diagnosis request and result details
     */
    static async getDiagnosisById(diagnosisId, customerId) {
        // Ownership verification built directly into the query
        const queryStr = `SELECT dr.*, dr.customer_id as "customerId", dr.vehicle_id as "vehicleId", dr.symptom_text as "symptomText",
              dr.created_at as "createdAt",
              dr.status,
              dr.id as id
       FROM diagnosis_requests dr
       WHERE dr.id = $1 AND dr.customer_id = $2`;
        const params = [diagnosisId, customerId];
        const reqRes = await (0, database_1.query)(queryStr, params);
        if (reqRes.rows.length === 0) {
            return null;
        }
        const dbRequest = reqRes.rows[0];
        // Fetch media
        const mediaRes = await (0, database_1.query)('SELECT id, media_type as "mediaType", url FROM diagnosis_media WHERE diagnosis_request_id = $1', [diagnosisId]);
        // Fetch results
        const resultRes = await (0, database_1.query)(`SELECT id, issues, confidence_score as "confidenceScore", risk_level as "riskLevel",
              diy_allowed as "diyAllowed", diy_steps as "diySteps", next_action as "nextAction"
       FROM diagnosis_results
       WHERE diagnosis_request_id = $1`, [diagnosisId]);
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
    static applySafetyGuardrail(result, symptomText, matchedIssues = []) {
        // ponytail: compile regex once with word boundaries to prevent false positives (like "absent" matching "abs")
        const safetyRegex = /\b(brake|steering|airbag|suspension|high-voltage|hybrid_battery|hybrid battery|stabilizer|abs)\b/i;
        let hasSafetyCriticalIssue = result.issues.some(issue => safetyRegex.test(issue.name)) ||
            safetyRegex.test(symptomText);
        if (matchedIssues.some(issue => issue.safety_critical)) {
            hasSafetyCriticalIssue = true;
        }
        const finalResult = { ...result };
        if (finalResult.riskLevel === 'medium' ||
            finalResult.riskLevel === 'high' ||
            finalResult.riskLevel === 'critical' ||
            hasSafetyCriticalIssue) {
            finalResult.diyAllowed = false;
            finalResult.nextAction = 'bookGarage';
        }
        return finalResult;
    }
}
exports.DiagnosisService = DiagnosisService;
