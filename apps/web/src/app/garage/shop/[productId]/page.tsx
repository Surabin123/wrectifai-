'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { ArrowLeft, Loader2, Star, AlertCircle, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { apiClient } from '@/lib/api-client';

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  
  // Review state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get<any>(`/products/${productId}`);
      setProduct(res);
      setErrorMsg(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) fetchProduct();
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    setAddingToCart(true);
    
    // Simulate slight delay for UX
    setTimeout(() => {
      const stored = localStorage.getItem('shopCart');
      let cart = stored ? JSON.parse(stored) : [];
      
      const existingIdx = cart.findIndex((i: any) => i.id === product.id);
      if (existingIdx >= 0) {
        cart[existingIdx].quantity = (cart[existingIdx].quantity || 1) + quantity;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          numericPrice: parseFloat(product.price),
          img: product.image,
          quantity: quantity,
          garageId: '86baf9c8-f2cc-4186-9466-d8087427047e' // Default fallback for now
        });
      }
      
      localStorage.setItem('shopCart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cart-updated'));
      setAddingToCart(false);
      router.push('/garage/shop/cart');
    }, 500);
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return;
    
    setSubmittingReview(true);
    try {
      // Find a user ID from localStorage (quick mock auth check)
      const auth = localStorage.getItem('auth_store');
      let userId = '';
      if (auth) {
        const parsed = JSON.parse(auth);
        userId = parsed.state?.user?.id;
      }
      
      await apiClient.post(`/products/${productId}/reviews`, {
        rating,
        review_text: reviewText,
        user_id: userId || '4bd9f00d-f215-4cf4-9189-5144b6b66e3b' // fallback
      });
      
      setReviewText('');
      setRating(5);
      fetchProduct(); // Reload to get new review
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardShell>
        <TopNavbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardShell>
    );
  }

  if (errorMsg || !product) {
    return (
      <DashboardShell>
        <TopNavbar />
        <div className="p-8 text-center max-w-xl mx-auto">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Product Not Found</h2>
          <p className="text-slate-500 mb-6">{errorMsg || 'The requested product could not be found.'}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <TopNavbar />
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Breadcrumb / Back */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-slate-500">Shop / {product.category} / <span className="text-slate-900 font-medium">{product.name}</span></span>
        </div>
        
        {/* Product Details Section */}
        <div className="flex flex-col lg:flex-row gap-8">
          <Card className="flex-1 bg-white border-slate-100 rounded-[20px] p-8 flex items-center justify-center min-h-[400px]">
            {product.image ? (
               <Image src={product.image} alt={product.name} width={400} height={400} className="object-contain" />
            ) : (
               <ShoppingBag className="w-32 h-32 text-slate-200" />
            )}
          </Card>
          
          <div className="lg:w-1/3 flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
              <p className="text-slate-500 text-sm mb-4">By {product.seller_name || 'WrectifAI Verified Seller'}</p>
              
              <div className="flex items-center gap-2 mb-6">
                 {[1,2,3,4,5].map(star => (
                    <Star key={star} className={\`w-5 h-5 \${product.reviews?.length && product.reviews.reduce((a:any,c:any)=>a+c.rating,0)/product.reviews.length >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}\`} />
                 ))}
                 <span className="text-sm text-slate-500 ml-2">({product.reviews?.length || 0} reviews)</span>
              </div>
              
              <div className="text-4xl font-extrabold text-blue-600 mb-6">₹{parseFloat(product.price).toLocaleString('en-IN')}</div>
              
              <p className="text-slate-700 leading-relaxed mb-8">
                {product.description || 'No description available for this product.'}
              </p>
              
              {product.is_diy_kit && (
                <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl text-sm font-medium mb-6">
                  ✨ This is a DIY Kit - comes with self-installation guide!
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-700">Quantity:</span>
                <div className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-1 bg-white">
                  <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="text-slate-500 font-bold px-2 py-1">-</button>
                  <span className="font-bold w-6 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => q+1)} className="text-slate-500 font-bold px-2 py-1">+</button>
                </div>
              </div>
              
              <Button onClick={handleAddToCart} disabled={addingToCart} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl text-lg flex items-center justify-center gap-2">
                {addingToCart ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <><ShoppingBag className="w-5 h-5" /> Add to Cart</>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Reviews Section */}
        <div className="pt-8 border-t border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Customer Reviews</h2>
          
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3">
              <Card className="p-6 bg-slate-50 border-0 shadow-none rounded-[20px]">
                <h3 className="font-bold text-lg mb-4">Write a Review</h3>
                <div className="flex gap-2 mb-4">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => setRating(star)} className="focus:outline-none">
                      <Star className={\`w-8 h-8 \${rating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}\`} />
                    </button>
                  ))}
                </div>
                <textarea 
                  className="w-full rounded-xl border border-slate-200 p-4 text-sm mb-4 min-h-[100px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  placeholder="Share your experience with this product..."
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                />
                <Button onClick={handleSubmitReview} disabled={submittingReview || !reviewText.trim()} className="w-full rounded-xl">
                  {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Review'}
                </Button>
              </Card>
            </div>
            
            <div className="flex-1 space-y-4">
              {!product.reviews || product.reviews.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-[20px] text-slate-500">
                  No reviews yet. Be the first to review this product!
                </div>
              ) : (
                product.reviews.map((rev: any) => (
                  <Card key={rev.id} className="p-6 rounded-[20px] shadow-sm border-slate-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-slate-900">{rev.first_name} {rev.last_name}</div>
                        <div className="text-xs text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex">
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} className={\`w-4 h-4 \${rev.rating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}\`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 text-sm mt-3">{rev.review_text}</p>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
