CREATE TABLE IF NOT EXISTS garage_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garage_reviews_garage_id ON garage_reviews(garage_id);

-- Insert some default reviews for initial garages to replace mock data
INSERT INTO garage_reviews (garage_id, customer_name, rating, text, created_at)
SELECT id, 'Arjun R.', 5, 'Excellent service and professional staff. They explained everything clearly and fixed my car on time.', NOW() - INTERVAL '5 days' FROM garages LIMIT 1;

INSERT INTO garage_reviews (garage_id, customer_name, rating, text, created_at)
SELECT id, 'Suresh M.', 4.8, 'Very helpful team, free pickup and drop was extremely convenient. Highly recommend their service!', NOW() - INTERVAL '7 days' FROM garages LIMIT 1;
