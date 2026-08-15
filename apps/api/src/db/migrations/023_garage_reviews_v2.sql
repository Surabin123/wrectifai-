-- Expansion of garage reviews system
CREATE TABLE IF NOT EXISTS garage_review_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES garage_reviews(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('like', 'unlike')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(review_id, customer_id)
);

CREATE TABLE IF NOT EXISTS garage_review_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES garage_reviews(id) ON DELETE CASCADE,
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE garage_reviews ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE garage_reviews ADD COLUMN IF NOT EXISTS likes_count INT DEFAULT 0;
ALTER TABLE garage_reviews ADD COLUMN IF NOT EXISTS unlikes_count INT DEFAULT 0;
ALTER TABLE garage_reviews ADD COLUMN IF NOT EXISTS replies_count INT DEFAULT 0;
