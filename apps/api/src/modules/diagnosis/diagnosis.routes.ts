import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import { DiagnosisService } from './diagnosis.service';
import { query } from '../../config/database';

export const diagnosisRouter = Router();

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
        intakeAnswers
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
    // Suppress error in response to avoid disrupting frontend, return empty array
    console.error('Fetch history error:', err);
    return success(res, { messages: [] }, 200);
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
    // Suppress error in response to avoid disrupting frontend
    console.error('Save history error:', err);
    return success(res, { synced: false }, 200);
  }
});
