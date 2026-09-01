import { Router } from 'express';
import { success, error } from '../../utils/response';
import { authenticate } from '../../middleware/auth';
import { ReviewsService } from './reviews.service';

export const reviewsRouter = Router();

// Create a review
reviewsRouter.post('/', authenticate, async (req, res) => {
  try {
    const { garageId, rating, comment } = req.body;
    if (!garageId || !rating) {
      return error(res, 'Garage ID and rating are required', 'BAD_REQUEST', 400);
    }

    if (rating < 1 || rating > 5) {
      return error(res, 'Rating must be between 1 and 5', 'BAD_REQUEST', 400);
    }

    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    const customerName = req.user?.name || 'Customer';

    if (!userId) {
      return error(res, 'Authentication required to submit a review', 'UNAUTHORIZED', 401);
    }

    // RBAC: Only allow users with the 'user' or 'customer' role to submit reviews
    if (!userRoles.includes('user') && !userRoles.includes('customer')) {
      return error(res, 'Only customers can leave reviews', 'FORBIDDEN', 403);
    }

    const review = await ReviewsService.createReview(garageId, userId, customerName, rating, comment || '');
    return success(res, review, 201);
  } catch (err: any) {
    if (err.code === '23505') {
      return error(res, 'You have already reviewed this garage', 'CONFLICT', 409);
    }
    console.error('Error creating review:', err);
    return error(res, 'Failed to create review', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Get reviews for a garage
reviewsRouter.get('/garage/:garageId', async (req, res) => {
  try {
    const currentUserId = req.query.userId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'newest';
    
    const result = await ReviewsService.getReviewsByGarage(req.params.garageId, currentUserId, page, limit, sortBy);
    return success(res, result);
  } catch (err: any) {
    console.error('Error fetching reviews:', err);
    return error(res, 'Failed to fetch reviews', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Get reviews written by the authenticated user
reviewsRouter.get('/my-reviews', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'Authentication required', 'UNAUTHORIZED', 401);
    }
    
    // Will implement logic in service if missing, but we can query directly to match pattern of stats
    const { query } = require('../../config/database');
    const result = await query(
      `SELECT r.id, r.rating, r.comment as text, r.created_at as date, g.name as "garageName"
       FROM garage_reviews r
       JOIN garages g ON r.garage_id = g.id
       WHERE r.customer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return success(res, result.rows);
  } catch (err: any) {
    console.error('Error fetching my reviews:', err);
    return error(res, 'Failed to fetch your reviews', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Vote on a review (like/unlike/none)
reviewsRouter.post('/:reviewId/vote', authenticate, async (req, res) => {
  try {
    const { voteType } = req.body; // 'like', 'unlike', or 'none'
    if (!['like', 'unlike', 'none'].includes(voteType)) {
      return error(res, 'Invalid vote type', 'BAD_REQUEST', 400);
    }

    const userId = req.user?.userId;
    if (!userId) {
      return error(res, 'Authentication required to vote', 'UNAUTHORIZED', 401);
    }

    await ReviewsService.voteReview(req.params.reviewId, userId, voteType);
    return success(res, { success: true }, 200);
  } catch (err: any) {
    console.error('Error voting on review:', err);
    return error(res, 'Failed to cast vote', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Reply to a review
reviewsRouter.post('/:reviewId/reply', authenticate, async (req, res) => {
  try {
    const { text, garageId } = req.body;
    if (!text) {
      return error(res, 'Reply text is required', 'BAD_REQUEST', 400);
    }

    const userId = req.user?.userId;
    const userRoles = req.user?.roles || [];
    if (!userId) {
      return error(res, 'Authentication required to reply', 'UNAUTHORIZED', 401);
    }

    // Determine if garage owner or regular user
    const isGarageOwner = userRoles.includes('garage') && !!garageId;

    const reply = await ReviewsService.replyToReview(req.params.reviewId, userId, text, isGarageOwner, garageId || null);
    return success(res, reply, 201);
  } catch (err: any) {
    console.error('Error replying to review:', err);
    return error(res, 'Failed to create reply', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Admin: Get all reviews
reviewsRouter.get('/', authenticate, async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!userRoles.includes('admin')) {
      return error(res, 'Only admins can view all reviews', 'FORBIDDEN', 403);
    }
    
    const reviews = await ReviewsService.getAllReviews();
    return success(res, reviews);
  } catch (err: any) {
    console.error('Error fetching all reviews:', err);
    return error(res, 'Failed to fetch reviews', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Admin: Hide a review
reviewsRouter.patch('/:reviewId/hide', authenticate, async (req, res) => {
  try {
    const userRoles = req.user?.roles || [];
    if (!userRoles.includes('admin')) {
      return error(res, 'Only admins can hide reviews', 'FORBIDDEN', 403);
    }
    
    const review = await ReviewsService.hideReview(req.params.reviewId);
    return success(res, review);
  } catch (err: any) {
    console.error('Error hiding review:', err);
    return error(res, 'Failed to hide review', 'INTERNAL_SERVER_ERROR', 500);
  }
});
