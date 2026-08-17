import { test } from 'node:test';
import assert from 'node:assert';
import { DiagnosisService, DiagnosisResult } from './diagnosis.service';

test('Diagnosis Service - applySafetyGuardrail correctly overrides high risk issues', () => {
  const result: DiagnosisResult = {
    issues: [{ name: 'Engine oil level low', confidence: 90, estimatedPriceRange: { min: 20, max: 50 }, requiredParts: [] }],
    confidenceScore: 90,
    riskLevel: 'high', // Should trigger safety override
    diyAllowed: true,
    diySteps: ['Refill oil'],
    nextAction: 'diy',
  };

  const overridden = DiagnosisService.applySafetyGuardrail(result, 'oil is low');
  assert.strictEqual(overridden.diyAllowed, false);
  assert.strictEqual(overridden.nextAction, 'bookGarage');
});

test('Diagnosis Service - applySafetyGuardrail overrides safety-critical components (e.g. brakes)', () => {
  const result: DiagnosisResult = {
    issues: [{ name: 'Front brake pad worn out', confidence: 85, estimatedPriceRange: { min: 100, max: 200 }, requiredParts: ['Brake pads'] }],
    confidenceScore: 85,
    riskLevel: 'medium', // Low risk level but safety critical issue keyword 'brake'
    diyAllowed: true,
    diySteps: ['Replace pads'],
    nextAction: 'diy',
  };

  const overridden = DiagnosisService.applySafetyGuardrail(result, 'squeaking noise');
  assert.strictEqual(overridden.diyAllowed, false);
  assert.strictEqual(overridden.nextAction, 'bookGarage');
});

test('Diagnosis Service - applySafetyGuardrail overrides based on symptom keywords (e.g. steering)', () => {
  const result: DiagnosisResult = {
    issues: [{ name: 'Fluid level low', confidence: 70, estimatedPriceRange: { min: 15, max: 30 }, requiredParts: [] }],
    confidenceScore: 70,
    riskLevel: 'low',
    diyAllowed: true,
    diySteps: ['Add fluid'],
    nextAction: 'diy',
  };

  const overridden = DiagnosisService.applySafetyGuardrail(result, 'Steering is very hard to turn');
  assert.strictEqual(overridden.diyAllowed, false);
  assert.strictEqual(overridden.nextAction, 'bookGarage');
});

test('Diagnosis Service - applySafetyGuardrail leaves safe issues alone', () => {
  const result: DiagnosisResult = {
    issues: [{ name: 'Windshield wiper blades worn', confidence: 95, estimatedPriceRange: { min: 20, max: 40 }, requiredParts: ['Wiper blades'] }],
    confidenceScore: 95,
    riskLevel: 'low',
    diyAllowed: true,
    diySteps: ['Remove old blades', 'Install new blades'],
    nextAction: 'diy',
  };

  const overridden = DiagnosisService.applySafetyGuardrail(result, 'wipers leaving streaks');
  assert.strictEqual(overridden.diyAllowed, true);
  assert.strictEqual(overridden.nextAction, 'diy');
});

test('Diagnosis Service - applySafetyGuardrail overrides based on safety_critical flag in matchedIssues', () => {
  const result: DiagnosisResult = {
    issues: [{ name: 'Check lights', confidence: 95, estimatedPriceRange: { min: 10, max: 20 }, requiredParts: [] }],
    confidenceScore: 95,
    riskLevel: 'low',
    diyAllowed: true,
    diySteps: ['Replace bulb'],
    nextAction: 'diy',
  };

  const matchedIssues = [
    {
      id: '1',
      category: 'lighting',
      issue_name: 'Check lights',
      description: 'Light bulb issue',
      risk_level: 'low' as const,
      diy_allowed: true,
      safety_critical: true,
      required_parts: [],
      estimated_cost_min: 0,
      estimated_cost_max: 0,
      diy_steps: [],
      garage_steps: [],
      base_confidence: 0.8,
    }
  ];

  const overridden = DiagnosisService.applySafetyGuardrail(result, 'light is off', matchedIssues);
  assert.strictEqual(overridden.diyAllowed, false);
  assert.strictEqual(overridden.nextAction, 'bookGarage');
});

test('Diagnosis Service - runDiagnosis rejects invalid media mime types', async () => {
  await assert.rejects(
    DiagnosisService.runDiagnosis('cust123', 'veh123', 'symptoms', [
      { mediaType: 'image', url: 'data:text/html;base64,PGh0bWw+c29tZSBodG1sPC9odG1sPg==' }
    ]),
    /Unsupported or invalid MIME type for image: text\/html/
  );
});

test('Diagnosis Service - runDiagnosis rejects files exceeding size limits', async () => {
  // 11MB image (base64 length approx 15.3MB)
  const hugeBase64 = 'data:image/png;base64,' + 'A'.repeat(15.3 * 1024 * 1024);
  await assert.rejects(
    DiagnosisService.runDiagnosis('cust123', 'veh123', 'symptoms', [
      { mediaType: 'image', url: hugeBase64 }
    ]),
    /File size exceeds the limit of 10MB for image/
  );
});


