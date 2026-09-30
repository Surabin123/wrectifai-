-- Backend-owned temporary OTP challenges for the admin garage-registration flow.
-- The code itself stays in the verification provider; this table records only
-- the short-lived challenge lifecycle and binds it to the initiating admin.
CREATE TABLE IF NOT EXISTS garage_registration_otp_challenges (
  id VARCHAR(36) PRIMARY KEY,
  requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(32) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garage_registration_otp_request_phone
  ON garage_registration_otp_challenges (requested_by_user_id, phone, created_at DESC);
