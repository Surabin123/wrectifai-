-- WRECTIFAI PostgreSQL Schema
-- Translated from MongoDB schema in Docs/schema.md
-- Generated: 2026-07-03

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1) RBAC Identity Tables
-- ============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    mobile_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'suspended', 'pendingVerification')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE CHECK (code IN ('customer', 'garage', 'vendor', 'admin')),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- ============================================
-- 2) Vehicle Tables
-- ============================================

-- Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    vin VARCHAR(17) UNIQUE,
    mileage INTEGER,
    warranty JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_created_at ON vehicles(created_at);

-- Vehicle service history
CREATE TABLE vehicle_service_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_date TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    garage_id UUID,
    cost NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicle_service_history_vehicle_id ON vehicle_service_history(vehicle_id);

-- ============================================
-- 3) Diagnosis Tables
-- ============================================

-- Diagnosis requests
CREATE TABLE diagnosis_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    symptom_text TEXT,
    status VARCHAR(50) NOT NULL CHECK (status IN ('received', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnosis_requests_customer_id ON diagnosis_requests(customer_id);
CREATE INDEX idx_diagnosis_requests_vehicle_id ON diagnosis_requests(vehicle_id);
CREATE INDEX idx_diagnosis_requests_status ON diagnosis_requests(status);

-- Diagnosis media
CREATE TABLE diagnosis_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagnosis_request_id UUID NOT NULL REFERENCES diagnosis_requests(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnosis_media_diagnosis_request_id ON diagnosis_media(diagnosis_request_id);

-- Diagnosis results
CREATE TABLE diagnosis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagnosis_request_id UUID NOT NULL UNIQUE REFERENCES diagnosis_requests(id) ON DELETE CASCADE,
    issues JSONB NOT NULL,
    confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    diy_allowed BOOLEAN NOT NULL,
    diy_steps TEXT[],
    next_action VARCHAR(50) NOT NULL CHECK (next_action IN ('diy', 'bookGarage', 'buyParts')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diagnosis_results_risk_level ON diagnosis_results(risk_level);

-- ============================================
-- 4) Garage and Quote Tables
-- ============================================

-- Garages table
CREATE TABLE garages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    location JSONB,
    specializations TEXT[],
    certifications TEXT[],
    pickup_drop_supported BOOLEAN NOT NULL DEFAULT false,
    approval_status VARCHAR(50) NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
    rating_avg NUMERIC(3, 2),
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_garages_owner_user_id ON garages(owner_user_id);
CREATE INDEX idx_garages_approval_status ON garages(approval_status);
CREATE INDEX idx_garages_specializations ON garages USING GIN(specializations);

-- Garage documents
CREATE TABLE garage_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    verification_status VARCHAR(50) NOT NULL CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_garage_documents_garage_id ON garage_documents(garage_id);
CREATE INDEX idx_garage_documents_verification_status ON garage_documents(verification_status);

-- Garage slots
CREATE TABLE garage_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_garage_slots_garage_id ON garage_slots(garage_id);
CREATE INDEX idx_garage_slots_start_at ON garage_slots(start_at);
CREATE INDEX idx_garage_slots_is_available ON garage_slots(is_available);

-- Quote requests
CREATE TABLE quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    diagnosis_request_id UUID REFERENCES diagnosis_requests(id),
    issue_summary TEXT NOT NULL,
    preferred_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL CHECK (status IN ('open', 'quoted', 'selected', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quote_requests_customer_id ON quote_requests(customer_id);
CREATE INDEX idx_quote_requests_vehicle_id ON quote_requests(vehicle_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);

-- Quotes
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    eta_days INTEGER,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'selected', 'rejected', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotes_quote_request_id ON quotes(quote_request_id);
CREATE INDEX idx_quotes_garage_id ON quotes(garage_id);
CREATE INDEX idx_quotes_status ON quotes(status);

-- Bookings
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id),
    booking_type VARCHAR(50) NOT NULL CHECK (booking_type IN ('instant', 'quoteBased')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pendingPayment', 'confirmed', 'inService', 'completed', 'cancelled')),
    total_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_garage_id ON bookings(garage_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX idx_bookings_scheduled_at ON bookings(scheduled_at);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================
-- 5) Marketplace Tables
-- ============================================

-- Sellers table
CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_type VARCHAR(50) NOT NULL CHECK (seller_type IN ('platform', 'garage', 'vendor')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    garage_id UUID REFERENCES garages(id) ON DELETE SET NULL,
    approval_status VARCHAR(50) NOT NULL CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sellers_seller_type ON sellers(seller_type);
CREATE INDEX idx_sellers_user_id ON sellers(user_id);
CREATE INDEX idx_sellers_garage_id ON sellers(garage_id);
CREATE INDEX idx_sellers_approval_status ON sellers(approval_status);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_diy_kit BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    compatible_vehicle_rules JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_is_diy_kit ON products(is_diy_kit);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Inventory table
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    qty_available INTEGER NOT NULL DEFAULT 0 CHECK (qty_available >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_qty_available ON inventory(qty_available);

-- Carts table
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_customer_id ON carts(customer_id);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pendingPayment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    subtotal NUMERIC(12, 2) NOT NULL,
    shipping_cost NUMERIC(12, 2) NOT NULL,
    tax NUMERIC(12, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    fulfillment_mode VARCHAR(50) NOT NULL CHECK (fulfillment_mode IN ('inHouse', 'thirdParty')),
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_fulfillment_mode ON orders(fulfillment_mode);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ============================================
-- 6) Payment and Trust Tables
-- ============================================

-- Payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    provider VARCHAR(100) NOT NULL,
    provider_intent_id VARCHAR(255) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL CHECK (status IN ('created', 'requiresAction', 'succeeded', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_payer_user_id ON payments(payer_user_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    rating_overall INTEGER NOT NULL CHECK (rating_overall >= 1 AND rating_overall <= 5),
    rating_price INTEGER CHECK (rating_price >= 1 AND rating_price <= 5),
    rating_quality INTEGER CHECK (rating_quality >= 1 AND rating_quality <= 5),
    rating_time INTEGER CHECK (rating_time >= 1 AND rating_time <= 5),
    rating_behavior INTEGER CHECK (rating_behavior >= 1 AND rating_behavior <= 5),
    comment TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_garage_id ON reviews(garage_id);
CREATE INDEX idx_reviews_is_verified ON reviews(is_verified);

-- Garage badges table
CREATE TABLE garage_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    badge_key VARCHAR(50) NOT NULL CHECK (badge_key IN ('topRated', 'budgetFriendly', 'evSpecialist', 'mostTrusted')),
    active BOOLEAN NOT NULL DEFAULT true,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_garage_badges_garage_id ON garage_badges(garage_id);
CREATE INDEX idx_garage_badges_badge_key ON garage_badges(badge_key);
CREATE INDEX idx_garage_badges_active ON garage_badges(active);

-- ============================================
-- 7) Notification Tables
-- ============================================

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('sms', 'email', 'push', 'inApp')),
    template_key VARCHAR(100) NOT NULL,
    payload JSONB,
    status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================
-- Trigger for updated_at columns
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_garages_updated_at BEFORE UPDATE ON garages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed default roles
-- ============================================

INSERT INTO roles (code, name) VALUES
    ('customer', 'Customer'),
    ('garage', 'Garage Owner'),
    ('vendor', 'Vendor'),
    ('admin', 'Administrator');
