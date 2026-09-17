import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../../../../.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}
import { query } from '../config/database';
import { VehicleImageService } from '../modules/vehicles/vehicle-image.service';

async function run() {
  const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--confirm');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !process.argv.includes('--force')) {
    console.error('❌ Refusing to run cleanup script in production without explicit --force flag.');
    process.exit(1);
  }

  if (isDryRun) {
    console.log('ℹ️  Running in DRY-RUN mode. Pass --confirm (and --force in production) to execute actual mutations.');
  }

  const cacheResult = await query('SELECT key, image_url FROM vehicle_images_cache');
  console.log(`Found ${cacheResult.rows.length} images in cache.`);

  let deletedCount = 0;
  for (const row of cacheResult.rows) {
    const { key, image_url } = row;
    console.log(`\nValidating ${key}...`);
    const parts = key.split('-');
    const make = parts[0] || 'Vehicle';
    const model = parts[1] || '';

    const isValid = await (VehicleImageService as any).validateVehicleImage(image_url, make, model);
    if (!isValid) {
      if (isDryRun) {
        console.log(`[DRY-RUN] Would delete invalid image for ${key}: (${image_url})`);
      } else {
        console.log(`❌ Invalid image for ${key}. Deleting... (${image_url})`);
        await query('DELETE FROM vehicle_images_cache WHERE key = $1', [key]);
      }
      deletedCount++;
    } else {
      console.log(`✅ Valid image for ${key}. Kept.`);
    }
  }

  console.log(`\nFinished! ${isDryRun ? 'Would have deleted' : 'Deleted'} ${deletedCount} bad images.`);
  process.exit(0);
}

run().catch(console.error);
