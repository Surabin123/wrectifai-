-- Remove the demo promo rows seeded by migration 006.
-- Garage-created offers and combo deals have different IDs and are preserved.
DELETE FROM promos
WHERE id IN (
  'summer-care-combo',
  'monsoon-care-combo',
  'winter-care-combo',
  'festival-shine-combo',
  'weekend-check-combo',
  'mega-car-wash-offer',
  'brake-care-special',
  'ac-service-offer'
);
