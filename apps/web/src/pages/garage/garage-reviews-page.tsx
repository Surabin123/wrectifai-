'use client';
import React, { useEffect, useState } from 'react';
import { getGarageReviews, replyToReview, Review } from '@/lib/reviews-api';

export function GarageReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replying, setReplying] = useState<string | null>(null);
  const [garageId, setGarageId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('wrectifai-user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.garageId) {
          setGarageId(user.garageId);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (garageId) {
      loadReviews(garageId);
    } else {
      setLoading(false); // Wait for garageId to be available
    }
  }, [garageId]);

  const loadReviews = async (id: string) => {
    try {
      setLoading(true);
      const data = await getGarageReviews(id);
      setReviews(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleReplyChange = (reviewId: string, text: string) => {
    setReplyText(prev => ({ ...prev, [reviewId]: text }));
  };

  const submitReply = async (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text?.trim() || !garageId) return;

    try {
      setReplying(reviewId);
      const newReply = await replyToReview(reviewId, text.trim(), garageId);
      setReviews(prev => prev.map(r => {
        if (r.id === reviewId) {
          return {
            ...r,
            replies: [...(r.replies || []), newReply],
            repliesCount: r.repliesCount + 1
          };
        }
        return r;
      }));
      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
    } catch (err: any) {
      alert(err.message || 'Failed to submit reply');
    } finally {
      setReplying(null);
    }
  };

  if (!garageId && !loading) {
    return <div className="p-8 text-center text-slate-500">Error: Garage profile not found. Please ensure you are logged in as a Garage.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading reviews...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Garage Reviews</h1>
        <p className="text-slate-600 mt-1">See what customers are saying about your garage and reply directly.</p>
      </div>

      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-900">{review.customerName}</h3>
                <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
              </div>
              <div className="flex items-center">
                <span className="font-bold text-slate-800 text-lg mr-1">{review.rating}</span>
                <span className="text-yellow-400 text-xl">★</span>
              </div>
            </div>
            
            <p className="text-slate-700 whitespace-pre-wrap">{review.comment}</p>
            
            <div className="mt-4 flex items-center text-sm text-slate-500">
              <span className="mr-4">👍 {review.likesCount || 0}</span>
              <span>👎 {review.unlikesCount || 0}</span>
            </div>

            {/* Replies section */}
            <div className="mt-6 space-y-4">
              {(review.replies || []).map((reply) => (
                <div key={reply.id} className={`pl-4 border-l-2 ${reply.isGarageOwner ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'} py-2`}>
                  <div className="flex justify-between">
                    <span className="font-semibold text-sm text-slate-800">
                      {reply.authorName} {reply.isGarageOwner && <span className="text-blue-600 text-xs ml-1">(Owner)</span>}
                    </span>
                    <span className="text-xs text-slate-500">{formatDate(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{reply.text}</p>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex space-x-3">
              <input
                type="text"
                placeholder="Write a reply..."
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={replyText[review.id] || ''}
                onChange={(e) => handleReplyChange(review.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitReply(review.id);
                }}
              />
              <button
                onClick={() => submitReply(review.id)}
                disabled={replying === review.id || !replyText[review.id]?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {replying === review.id ? 'Sending...' : 'Reply'}
              </button>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            No reviews yet. Check back later!
          </div>
        )}
      </div>
    </div>
  );
}

export default GarageReviewsPage;
