import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import { DiagnosisService } from './diagnosis.service';
import { query } from '../../config/database';

export const diagnosisRouter = Router();

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'diagnosis');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mp3', '.wav', '.ogg']);
    if (!allowedExts.has(ext)) return cb(new Error('Invalid file extension'), '');
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max overall
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm',
      'audio/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Please upload JPEG, PNG, WebP, or GIF images.`));
    }
  }
});

// Upload and validate media — uses callback mode so multer errors are returned as proper JSON
diagnosisRouter.post('/upload-media', authenticate, (req, res) => {
  // Wrap multer in callback mode to catch its errors inline
  upload.single('file')(req, res, async (multerErr) => {
    try {
      // Handle multer-specific errors first
      if (multerErr) {
        console.error('Multer upload error:', multerErr.message);
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
          return error(res, 'File is too large. Maximum size is 50MB.', 'VALIDATION_ERROR', 400);
        }
        return error(res, multerErr.message || 'File upload failed', 'BAD_REQUEST', 400);
      }

      const file = req.file;
      if (!file) {
        return error(res, 'No file received. Please select a file to upload.', 'BAD_REQUEST', 400);
      }

      // Validate size per media type
      if (file.mimetype.startsWith('image/') && file.size > 10 * 1024 * 1024) {
        return error(res, 'Image exceeds 10MB limit', 'VALIDATION_ERROR', 400);
      }
      if (file.mimetype.startsWith('audio/') && file.size > 10 * 1024 * 1024) {
        return error(res, 'Audio exceeds 10MB limit', 'VALIDATION_ERROR', 400);
      }
      if (file.mimetype.startsWith('video/') && file.size > 50 * 1024 * 1024) {
        return error(res, 'Video exceeds 50MB limit', 'VALIDATION_ERROR', 400);
      }

      const header = fs.readFileSync(file.path).subarray(0, 16);
      const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      const isPng = header.subarray(0, 8).equals(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isGif = header.subarray(0, 6).toString('ascii') === 'GIF87a' || header.subarray(0, 6).toString('ascii') === 'GIF89a';
      const isWebp = header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
      const isMp4 = header.subarray(4, 8).toString('ascii') === 'ftyp';
      const isWebm = header.subarray(0, 4).equals(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]));
      const isMp3 = header.subarray(0, 3).toString('ascii') === 'ID3' || (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);
      const isWav = header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WAVE';
      const isOgg = header.subarray(0, 4).toString('ascii') === 'OggS';
      const validAudio = (file.mimetype === 'audio/webm' && isWebm) ||
        ((file.mimetype === 'audio/mp3' || file.mimetype === 'audio/mpeg') && isMp3) ||
        (file.mimetype === 'audio/wav' && isWav) || (file.mimetype === 'audio/ogg' && isOgg);
      const validVideo = (file.mimetype === 'video/mp4' && isMp4) || (file.mimetype === 'video/webm' && isWebm);
      const isAudioOrVideo = file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/');
      if ((file.mimetype === 'image/jpeg' && !isJpeg) || (file.mimetype === 'image/png' && !isPng) ||
          (file.mimetype === 'image/gif' && !isGif) || (file.mimetype === 'image/webp' && !isWebp) ||
          (file.mimetype.startsWith('audio/') && !validAudio) ||
          (file.mimetype.startsWith('video/') && !validVideo)) {
        fs.unlinkSync(file.path);
        return error(res, 'File content does not match its declared type', 'VALIDATION_ERROR', 400);
      }

      // Construct a URL relative to the server so the diagnosis service can read the file
      const url = `/uploads/diagnosis/${file.filename}`;
      
      // Perform strict validation for images
      if (file.mimetype.startsWith('image/')) {
        const base64Image = fs.readFileSync(file.path).toString('base64');
        const validation = await DiagnosisService.validateImageRelevance(base64Image, file.mimetype);
        if (!validation.isValid) {
          fs.unlinkSync(file.path); // fail closed, discard file
          return error(res, validation.reason || 'Image does not appear to be vehicle-related. Please upload a clear photo of the car or issue.', 'VALIDATION_ERROR', 400);
        }
      }

      return success(res, { url, mimetype: file.mimetype, size: file.size, isValid: true });
    } catch (err: any) {
      console.error('Upload media handler error:', err);
      return error(res, err.message || 'Failed to upload media', 'INTERNAL_SERVER_ERROR', 500);
    }
  });
});

// Submit symptoms and run LLM diagnosis
diagnosisRouter.post('/', authenticate, requireRole(['user', 'customer', 'garage', 'vendor', 'admin']), async (req, res) => {
  try {
    const { vehicleId, symptomText, media, intakeAnswers, stage } = req.body;
    
    if (!vehicleId) {
      return error(res, 'Vehicle ID is required', 'BAD_REQUEST', 400);
    }
    if (!symptomText) {
      return error(res, 'Symptom text is required', 'BAD_REQUEST', 400);
    }

    const customerId = req.user?.userId;
    if (!customerId) {
      return error(res, 'Authentication failed: no customer ID found', 'UNAUTHORIZED', 401);
    }

    // Verify user exists in the database to prevent foreign key constraint violations (e.g. from stale token sessions after DB resets)
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [customerId]);
    if (userCheck.rows.length === 0) {
      return error(res, 'User session is invalid or user does not exist. Please log in again.', 'UNAUTHORIZED', 401);
    }

    if (stage === 'questions') {
      const questionsData = await DiagnosisService.generateQuestions(
        customerId,
        vehicleId,
        symptomText,
        intakeAnswers,
        media || []
      );
      return success(res, questionsData, 200);
    }

    const diagnosis = await DiagnosisService.runDiagnosis(
      customerId,
      vehicleId,
      symptomText,
      media || [],
      intakeAnswers
    );

    return success(res, diagnosis, 201);
  } catch (err: any) {
    console.error('Diagnosis creation error:', err);
    if (err.message.includes('Vehicle not found') || err.message.includes('does not belong to the user')) {
      return error(res, err.message, 'BAD_REQUEST', 400);
    }
    return error(res, err.message || 'An error occurred during diagnosis processing', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Chat with the diagnosis AI
diagnosisRouter.post('/chat', authenticate, requireRole(['user', 'customer', 'garage', 'vendor', 'admin']), async (req, res) => {
  try {
    const { vehicleId, conversationHistory } = req.body;
    
    if (!vehicleId) {
      return error(res, 'Vehicle ID is required', 'BAD_REQUEST', 400);
    }
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return error(res, 'Conversation history is required', 'BAD_REQUEST', 400);
    }

    const customerId = req.user?.userId;
    if (!customerId) {
      return error(res, 'Authentication failed: no customer ID found', 'UNAUTHORIZED', 401);
    }

    const chatReply = await DiagnosisService.chat(customerId, vehicleId, conversationHistory);
    return success(res, chatReply, 200);
  } catch (err: any) {
    console.error('Diagnosis chat error:', err);
    return error(res, err.message || 'An error occurred during chat', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Fetch detailed diagnosis result
diagnosisRouter.get('/:id', authenticate, requireRole(['user', 'customer', 'garage', 'vendor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user?.userId;
    if (!customerId) {
      return error(res, 'Authentication failed: no customer ID found', 'UNAUTHORIZED', 401);
    }

    const diagnosis = await DiagnosisService.getDiagnosisById(id, customerId);
    
    if (!diagnosis) {
      return error(res, 'Diagnosis request not found', 'NOT_FOUND', 404);
    }

    return success(res, diagnosis, 200);
  } catch (err: any) {
    console.error('Diagnosis fetch error:', err);
    return error(res, err.message || 'An error occurred during fetch', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Get chat history
diagnosisRouter.get('/history/:vehicleId', authenticate, requireRole(['user', 'customer', 'garage', 'vendor', 'admin']), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const customerId = req.user?.userId;
    if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    
    const messages = await DiagnosisService.getChatHistory(customerId, vehicleId);
    return success(res, { messages }, 200);
  } catch (err: any) {
    console.error('Fetch history error:', err);
    return error(res, 'Failed to fetch diagnosis history', 'DATABASE_ERROR', 500);
  }
});

// Save chat history
diagnosisRouter.put('/history/:vehicleId', authenticate, requireRole(['user', 'customer', 'garage', 'vendor', 'admin']), async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { messages } = req.body;
    const customerId = req.user?.userId;
    if (!customerId) return error(res, 'Unauthorized', 'UNAUTHORIZED', 401);
    
    if (messages && Array.isArray(messages)) {
      await DiagnosisService.saveChatHistory(customerId, vehicleId, messages);
    }
    return success(res, { synced: true }, 200);
  } catch (err: any) {
    console.error('Save history error:', err);
    return error(res, 'Failed to save diagnosis history', 'DATABASE_ERROR', 500);
  }
});
