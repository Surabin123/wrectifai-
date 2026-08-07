import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate, requireRole } from '../../middleware/auth';
import { DiagnosisService } from './diagnosis.service';
import { query } from '../../config/database';

export const diagnosisRouter = Router();

// Submit symptoms and run LLM diagnosis
diagnosisRouter.post('/', authenticate, requireRole(['user', 'garage', 'vendor', 'admin']), async (req, res) => {
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

// Fetch detailed diagnosis result
diagnosisRouter.get('/:id', authenticate, requireRole(['user', 'garage', 'vendor', 'admin']), async (req, res) => {
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
    return error(res, err.message || 'An error occurred while fetching the diagnosis', 'INTERNAL_SERVER_ERROR', 500);
  }
});
