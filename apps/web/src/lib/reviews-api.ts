import { apiClient } from './api-client';

export interface ReviewReply {
  id: string;
  text: string;
  createdAt: string;
  authorName: string;
  isGarageOwner: boolean;
}

export interface Review {
  id: string;
  garageId: string;
  garageName?: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  likesCount: number;
  unlikesCount: number;
  repliesCount: number;
  isLikedByUser?: boolean;
  isUnlikedByUser?: boolean;
  isHidden?: boolean;
  replies: ReviewReply[];
}

export interface PaginatedReviews {
  data: Review[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getGarageReviews(garageId: string, userId?: string, page = 1, limit = 10, sortBy = 'newest'): Promise<PaginatedReviews> {
  const urlParams = new URLSearchParams();
  if (userId) urlParams.append('userId', userId);
  urlParams.append('page', page.toString());
  urlParams.append('limit', limit.toString());
  urlParams.append('sortBy', sortBy);

  const url = `/reviews/garage/${garageId}?${urlParams.toString()}`;
  return apiClient(url);
}

export async function getAllReviews(): Promise<Review[]> {
  return apiClient('/reviews');
}

export async function createReview(garageId: string, rating: number, comment: string): Promise<Review> {
  return apiClient('/reviews', {
    method: 'POST',
    body: JSON.stringify({ garageId, rating, comment }),
  });
}

export async function voteReview(reviewId: string, voteType: 'like' | 'unlike' | 'none'): Promise<{ success: boolean }> {
  return apiClient(`/reviews/${reviewId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ voteType }),
  });
}

export async function replyToReview(reviewId: string, text: string, garageId?: string): Promise<ReviewReply> {
  return apiClient(`/reviews/${reviewId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text, garageId }),
  });
}

export async function hideReview(reviewId: string): Promise<Review> {
  return apiClient(`/reviews/${reviewId}/hide`, {
    method: 'PATCH',
  });
}
