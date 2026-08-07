import { DiagnosisService } from './apps/api/src/modules/diagnosis/diagnosis.service';
import { getDbPool } from './apps/api/src/config/database';

async function test() {
  try {
    const customerId = '00000000-0000-0000-0000-000000000001';
    const vehicleId = '00000000-0000-0000-0000-000000000002';
    console.log('Testing generateQuestions...');
    const qData = await DiagnosisService.generateQuestions(customerId, vehicleId, 'bumper has a scratch');
    console.log('generateQuestions Result:', JSON.stringify(qData, null, 2));

    console.log('Testing runDiagnosis...');
    const dData = await DiagnosisService.runDiagnosis(customerId, vehicleId, 'bumper has a scratch', []);
    console.log('runDiagnosis Result:', JSON.stringify(dData, null, 2));

  } catch (err) {
    console.error('Test script caught error:', err);
  } finally {
    const pool = getDbPool();
    await pool.end();
  }
}
test();
