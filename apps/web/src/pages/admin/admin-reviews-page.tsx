'use client';
import React, { useEffect, useState } from 'react';
import { getAllReviews, hideReview, Review } from '@/lib/reviews-api';

export function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await getAllReviews();
      setReviews(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleHideReview = async (reviewId: string) => {
    try {
      await hideReview(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, isHidden: true } : r));
    } catch (err: any) {
      alert(err.message || 'Failed to hide review');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading reviews...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Reviews</h1>
          <p className="text-slate-600 mt-1">Manage and moderate reviews across all garages.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-500">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Garage</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Rating</th>
              <th className="px-6 py-4 w-1/3">Comment</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {reviews.map((review) => (
              <tr key={review.id} className={review.isHidden ? 'bg-red-50 opacity-75' : 'hover:bg-slate-50'}>
                <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                  {formatDate(review.createdAt)}
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">
                  {review.garageName || 'Unknown Garage'}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {review.customerName}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="font-bold text-slate-800 mr-1">{review.rating}</span>
                    <span className="text-yellow-400">★</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-slate-700 line-clamp-2">{review.comment}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  {review.isHidden ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Hidden
                    </span>
                  ) : (
                    <button
                      onClick={() => handleHideReview(review.id)}
                      className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors"
                    >
                      Hide
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No reviews found on the platform.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminReviewsPage;
