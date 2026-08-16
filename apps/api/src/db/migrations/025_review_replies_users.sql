-- Allow users to reply to reviews, not just garage owners
ALTER TABLE garage_review_replies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE garage_review_replies ALTER COLUMN garage_id DROP NOT NULL;
