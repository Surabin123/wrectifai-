-- Add image column to offers table to support Garage-created Promo Codes with images
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS image TEXT;
