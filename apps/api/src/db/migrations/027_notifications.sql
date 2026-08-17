CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- For specific user
    garage_id UUID, -- For specific garage
    is_admin BOOLEAN DEFAULT FALSE, -- For all admins
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_garage_id ON notifications(garage_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_admin ON notifications(is_admin);
