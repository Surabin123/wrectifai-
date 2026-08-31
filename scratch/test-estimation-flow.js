const path = require('path');
// Register @swc-node/register to load typescript modules
require('@swc-node/register');

// Set env variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log("Using Database URL:", process.env.DATABASE_URL);
    
    // 1. Create a dummy customer if not exists
    const customerId = '00000000-0000-0000-0000-000000000009';
    await pool.query(`
      INSERT INTO users (id, name, email, mobile_number, status)
      VALUES ($1, 'Sneha Test', 'sneha.test@example.com', '9876543219', 'active')
      ON CONFLICT (id) DO UPDATE SET name = 'Sneha Test'
    `, [customerId]);

    // 2. Create a vehicle (Maruti Suzuki Dzire, 2024, 34542 km)
    const vehicleId = '00000000-0000-0000-0000-000000000008';
    await pool.query(`
      INSERT INTO vehicles (id, customer_id, make, model, year, mileage, is_active, fuel_type, plate_number)
      VALUES ($1, $2, 'Maruti Suzuki', 'Dzire', 2024, 34542, true, 'Petrol', 'A12345')
      ON CONFLICT (id) DO UPDATE SET mileage = 34542, make = 'Maruti Suzuki', model = 'Dzire'
    `, [vehicleId, customerId]);

    // 3. Create a quote request with the issues
    const quoteRequestId = '00000000-0000-0000-0000-000000000007';
    const issueSummary = "Head Gasket Failure, Cracked Cylinder Head, Coolant Leak";
    await pool.query(`
      INSERT INTO quote_requests (id, customer_id, vehicle_id, issue_summary, status)
      VALUES ($1, $2, $3, $4, 'open')
      ON CONFLICT (id) DO UPDATE SET issue_summary = $4
    `, [quoteRequestId, customerId, vehicleId, issueSummary]);

    console.log("Seeded mock data. Running QuoteEstimationService...");

    // Import QuoteEstimationService using ts-node
    const { QuoteEstimationService } = require('../apps/api/src/modules/quotes/quote-estimation.service');

    const estimate = await QuoteEstimationService.generateLocalEstimate(quoteRequestId, 'Bengaluru');
    
    console.log("\n=== ESTIMATE GENERATED ===");
    console.log(JSON.stringify(estimate, null, 2));

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await pool.end();
  }
}

run();
