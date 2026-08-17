import 'dotenv/config';
import { DiagnosisService } from './apps/api/src/modules/diagnosis/diagnosis.service';
import { getDbPool } from './apps/api/src/config/database';

async function test() {
  try {
    console.log('Starting diagnosis test...');
    const result = await DiagnosisService.runDiagnosis(
      '887ae938-b723-4f0f-ab8c-b19169e4dc20',
      'c105d3cf-01f4-44f6-8fe5-7cc69299de50',
      'The car makes a grinding noise when I brake.',
      [],
      {}
    );
    console.log('Diagnosis succeeded:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Diagnosis failed:', err);
  } finally {
    getDbPool().end();
  }
}

test();
