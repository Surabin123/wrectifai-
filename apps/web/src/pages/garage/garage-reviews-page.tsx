'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { getGarageReviews, replyToReview, Review } from '@/lib/reviews-api';
import { useAuth } from '@/lib/auth-context';
import { Star, MessageCircle, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Filter } from 'lucide-react';

import { RoleGuard } from '@/components/common/role-guard';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { DashboardHeader } from '@/components/common/dashboard-header';
import { garageNavItems } from '@/lib/garage-config';

export function GarageReviewsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [replying, setReplying] = useState<string | null>(null);
  const [garageId, setGarageId] = useState<string | null>(null);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const reviewsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);

  // Metrics State
  const [averageRating, setAverageRating] = useState('0.0');
  const [ratingDistribution, setRatingDistribution] = useState<{ [key: number]: number }>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [totalReviewsCount, setTotalReviewsCount] = useState(0);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Invalid Date';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    if (!isAuthLoading && user?.garageId) {
      setGarageId(user.garageId);
    }
  }, [user, isAuthLoading]);

  useEffect(() => {
    if (garageId) {
      loadReviews(garageId, currentPage, reviewsPerPage, sortBy);
    } else {
      setLoading(false);
    }
  }, [garageId, currentPage, sortBy]);

  const loadReviews = async (id: string, page: number, limit: number, sort: string) => {
    try {
      setLoading(true);
      const res = await getGarageReviews(id, user?.id, page, limit, sort);
      setReviews(res.data || []);
      setTotalPages(res.totalPages || 1);
      setTotalReviewsCount(res.total || 0);
      
      if (res.stats) {
        setAverageRating(Number(res.stats.averageRating || 0).toFixed(1));
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        if (res.stats.distribution) {
          Object.keys(res.stats.distribution).forEach(key => {
            dist[Number(key) as keyof typeof dist] = res.stats!.distribution![key].count;
          });
        }
        setRatingDistribution(dist);
      }
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

  if (isAuthLoading || (garageId && loading)) {
    return (
      <RoleGuard allowedRoles={['garage']}>
        <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader title="Reviews" />}>
          <div className="flex h-[400px] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e2eefc] border-t-[#1a56db]"></div>
              <p className="text-sm font-semibold text-[#536891]">Loading Reviews...</p>
            </div>
          </div>
        </DashboardShell>
      </RoleGuard>
    );
  }

  if (!garageId) {
    return (
      <RoleGuard allowedRoles={['garage']}>
        <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader title="Reviews" />}>
          <div className="flex h-[400px] w-full items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">Garage Profile Not Found</h2>
              <p className="mt-2 text-sm text-slate-500">Please ensure you are logged in with a valid garage account.</p>
            </div>
          </div>
        </DashboardShell>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['garage']}>
        <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader title="Reviews" />}>
          <div className="p-8 text-center text-red-500 font-semibold">{error}</div>
        </DashboardShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['garage']}>
      <DashboardShell customNavItems={garageNavItems} hideBottomWidget={true} header={<DashboardHeader title="Reviews" />}>
        <div className="mx-auto max-w-5xl space-y-8 pb-12">
          {/* Header & Metrics Dashboard */}
          <div className="overflow-hidden rounded-[24px] border border-[#e2eefc] bg-white shadow-[0_4px_24px_rgba(22,48,112,0.03)]">
            <div className="border-b border-[#e2eefc] bg-gradient-to-b from-[#f8fbff] to-white px-8 py-6">
              <h1 className="text-[22px] font-bold text-[#17307a]">Garage Reviews</h1>
          <p className="text-[13px] font-medium text-[#536891] mt-1">
            Monitor customer feedback, track your rating, and reply to reviews.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#e2eefc] p-8">
          {/* Average Score */}
          <div className="flex flex-col items-center justify-center px-8 pb-6 md:pb-0 md:w-1/3">
            <h2 className="text-[56px] font-extrabold tracking-tight text-[#17307a] leading-none">
              {averageRating}
            </h2>
            <div className="mt-3 flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.round(Number(averageRating))
                      ? 'fill-[#ff9f1a] text-[#ff9f1a]'
                      : 'text-[#cbd4e6] fill-[#cbd4e6]/20'
                  }`}
                />
              ))}
            </div>
            <p className="mt-3 text-[13px] font-medium text-[#536891]">Based on {totalReviewsCount} reviews</p>
          </div>

          {/* Distribution Bars */}
          <div className="flex flex-col justify-center px-8 pt-6 md:pt-0 md:w-2/3 space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star as keyof typeof ratingDistribution] || 0;
              const percentage = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-4">
                  <div className="flex w-16 items-center justify-end gap-1.5 text-[13px] font-bold text-[#17307a]">
                    <span>{star}</span>
                    <Star className="h-3.5 w-3.5 fill-[#ff9f1a] text-[#ff9f1a]" />
                  </div>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f1f5fa]">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#ff9f1a] to-[#ffb142] transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-8 text-[12px] font-medium text-[#8a99ad]">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Controls & List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[16px] font-bold text-[#17307a]">All Reviews ({totalReviewsCount})</h3>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#8a99ad]" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as any); setCurrentPage(1); }}
              className="appearance-none rounded-full border border-[#e2eefc] bg-white px-4 py-2 pr-10 text-[13px] font-semibold text-[#17307a] shadow-sm focus:border-[#1a56db] focus:outline-none focus:ring-1 focus:ring-[#1a56db]"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%238a99ad' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="newest">Newest First</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
            </select>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#cbd4e6] bg-[#f8fbff] py-16">
            <MessageCircle className="h-12 w-12 text-[#cbd4e6] mb-4" />
            <h3 className="text-[16px] font-bold text-[#17307a]">No reviews yet</h3>
            <p className="mt-1 text-[13px] font-medium text-[#8a99ad]">When customers review your garage, they'll appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="overflow-hidden rounded-[20px] border border-[#e2eefc] bg-white shadow-[0_4px_16px_rgba(22,48,112,0.02)] transition-shadow hover:shadow-[0_4px_24px_rgba(22,48,112,0.06)]">
                <div className="p-6">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#eef4ff] to-[#e2eefc] text-[15px] font-bold text-[#1a56db] shadow-inner">
                        {(review.customerName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-[#17307a]">{review.customerName || 'Anonymous'}</h3>
                        <p className="text-[12px] font-medium text-[#8a99ad] mt-0.5">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#fff8eb] px-3 py-1.5 rounded-full border border-[#ffe4b5]">
                      <span className="font-bold text-[#ff9f1a] text-[13px]">{review.rating}</span>
                      <Star className="h-3.5 w-3.5 fill-[#ff9f1a] text-[#ff9f1a]" />
                    </div>
                  </div>

                  {/* Review Content */}
                  {review.comment ? (
                    <p className="mt-4 text-[14px] font-medium leading-relaxed text-[#536891]">
                      &quot;{review.comment}&quot;
                    </p>
                  ) : null}

                  {/* Interactions */}
                  <div className="mt-4 flex items-center gap-5 text-[12px] font-semibold text-[#8a99ad]">
                    <div className="flex items-center gap-1.5">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{review.likesCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ThumbsDown className="h-4 w-4" />
                      <span>{review.unlikesCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Replies Area */}
                <div className="bg-[#f8fbff] border-t border-[#e2eefc] px-6 py-5">
                  <div className="space-y-4 mb-4">
                    {(review.replies || []).map((reply) => (
                      <div key={reply.id} className="relative pl-6">
                        {/* Connecting Line */}
                        <div className="absolute left-[11px] top-4 h-[calc(100%-16px)] w-px bg-[#cbd4e6]"></div>
                        <div className="absolute left-0 top-[22px] h-px w-[22px] bg-[#cbd4e6]"></div>
                        
                        <div className="rounded-xl border border-[#e2eefc] bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-[#17307a] flex items-center gap-2">
                              {reply.authorName}
                              {reply.isGarageOwner && (
                                <span className="rounded-full bg-[#1a56db]/10 px-2 py-0.5 text-[10px] font-bold text-[#1a56db]">
                                  OWNER
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] font-medium text-[#8a99ad]">{formatDate(reply.createdAt)}</span>
                          </div>
                          <p className="mt-2 text-[13px] font-medium text-[#536891]">{reply.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input */}
                  <div className="flex items-end gap-3 pt-2">
                    <div className="flex-1">
                      <label className="sr-only">Write a reply</label>
                      <textarea
                        rows={1}
                        placeholder="Write a public reply to this customer..."
                        className="w-full resize-none rounded-xl border border-[#cbd4e6] bg-white px-4 py-3 text-[13px] font-medium text-[#17307a] shadow-sm transition-colors focus:border-[#1a56db] focus:outline-none focus:ring-1 focus:ring-[#1a56db] placeholder:text-[#8a99ad]"
                        value={replyText[review.id] || ''}
                        onChange={(e) => {
                          handleReplyChange(review.id, e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                      />
                    </div>
                    <button
                      onClick={() => submitReply(review.id)}
                      disabled={replying === review.id || !replyText[review.id]?.trim()}
                      className="flex h-11 items-center justify-center rounded-xl bg-[#1a56db] px-5 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-[#1546b5] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {replying === review.id ? 'Sending...' : 'Post Reply'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#cbd4e6] bg-white text-[#536891] transition-all hover:border-[#1a56db] hover:text-[#1a56db] disabled:opacity-50 disabled:pointer-events-none shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-[13px] font-bold text-[#17307a]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#cbd4e6] bg-white text-[#536891] transition-all hover:border-[#1a56db] hover:text-[#1a56db] disabled:opacity-50 disabled:pointer-events-none shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
        </div>
      </DashboardShell>
    </RoleGuard>
  );
}

export default GarageReviewsPage;
