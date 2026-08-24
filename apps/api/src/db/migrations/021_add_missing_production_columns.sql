-- Add missing columns that are causing 500 errors in production

-- 1. Add established_year to garages if it doesn't exist
ALTER TABLE garages ADD COLUMN IF NOT EXISTS established_year INTEGER;

-- 2. Add channel to notifications if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'inApp';

-- 3. Add currency and location to users if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
