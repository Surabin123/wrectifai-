BEGIN;

CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets(token_hash);

-- Adding duration_unit to support explicitly 'Minutes', 'Hours', or 'Days'
ALTER TABLE services ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(20) DEFAULT 'Minutes';
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(20) DEFAULT 'Minutes';

COMMIT;
