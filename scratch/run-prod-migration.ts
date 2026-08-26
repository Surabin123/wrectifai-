process.env.DATABASE_URL = 'postgresql://wrectifai_db_0c7o_user:gxnPqS81YygUaOLxRuPA0uzRulZqrOQV@dpg-da5epsjm8hqs73cemrrg-a.oregon-postgres.render.com/wrectifai_db_0c7o';
process.env.RENDER = 'true';

import { runMigrations } from '../apps/api/src/db/migrations';

runMigrations()
  .then(() => {
    console.log('Production migration completed successfully.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
