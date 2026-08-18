-- Migration to wipe dummy reviews from production
-- This ensures the admin dashboard and garage pages do not display hardcoded 
-- reviews dated August 8th and August 10th.

DELETE FROM garage_review_likes;
DELETE FROM garage_review_replies;
DELETE FROM garage_reviews;
