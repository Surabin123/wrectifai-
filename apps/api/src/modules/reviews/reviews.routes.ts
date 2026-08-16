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
    const userRole = req.user?.role;
    const customerName = req.user?.name || 'Anonymous User';

    if (!userId || (userRole !== 'user' && userRole !== 'admin')) {
      return error(res, 'Only customers can leave reviews', 'FORBIDDEN', 403);
    }

    const review = await ReviewsService.createReview(garageId, userId, customerName, rating, comment || '');
    return success(res, review, 201);
  } catch (err: any) {
    console.error('Error creating review:', err);
    return error(res, 'Failed to create review', 'INTERNAL_SERVER_ERROR', 500);
  }
});

// Get reviews for a garage
reviewsRouter.get('/garage/:garageId', async (req, res) => {
  try {
    const currentUserId = req.query.userId as string | undefined; // Optional current user for liked status
    const reviews = await ReviewsService.getReviewsByGarage(req.params.garageId, currentUserId);
    return success(res, reviews);
  } catch (err: any) {
    console.error('Error fetching reviews:', err);
    return error(res, 'Failed to fetch reviews', 'INTERNAL_SERVER_ERROR', 500);
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
    const userRole = req.user?.role;
    if (!userId) {
      return error(res, 'Authentication required to reply', 'UNAUTHORIZED', 401);
    }

    // Determine if garage owner or regular user
    const isGarageOwner = userRole === 'garage' && !!garageId;

    const reply = await ReviewsService.replyToReview(req.params.reviewId, userId, text, isGarageOwner, garageId || null);
    return success(res, reply, 201);
  } catch (err: any) {
    console.error('Error replying to review:', err);
    return error(res, 'Failed to create reply', 'INTERNAL_SERVER_ERROR', 500);
  }
});
