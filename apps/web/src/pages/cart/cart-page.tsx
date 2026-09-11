'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingBag, ArrowLeft, Loader2, AlertCircle, Tag, MapPin } from 'lucide-react';
import Image from 'next/image';
import { PaymentSuccessModal } from '@/components/common/payment-success-modal';
import { Modal } from '@/components/common/modal';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';
import { apiClient } from '@/lib/api-client';

import { getSavedCity, formatCurrencyForCity } from '@/utils/location';

export function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [userCity, setUserCity] = useState<string>('Bengaluru');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeApplied, setPromoCodeApplied] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);
  const [promoErrorMsg, setPromoErrorMsg] = useState<string | null>(null);
  
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  
  const [address, setAddress] = useState({
    name: '',
    phone: '',
    street: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    zip: ''
  });

  useEffect(() => {
    setUserCity(getSavedCity() || 'Bengaluru');
    const items = localStorage.getItem('shopCart');
    if (items) {
      setCartItems(JSON.parse(items));
    }

    const handleCityChange = () => {
      const newCity = getSavedCity() || 'Bengaluru';
      setUserCity(newCity);
    };
    window.addEventListener('city-changed', handleCityChange);
    return () => window.removeEventListener('city-changed', handleCityChange);
  }, []);

  const updateCart = (newItems: any[]) => {
    setCartItems(newItems);
    localStorage.setItem('shopCart', JSON.stringify(newItems));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const updateQuantity = (id: number | string, delta: number) => {
    const newItems = cartItems.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) };
      }
      return item;
    });
    updateCart(newItems);
  };

  const removeItem = (id: number | string) => {
    const newItems = cartItems.filter(item => item.id !== id);
    updateCart(newItems);
  };

  const subtotal = cartItems.reduce((acc, item) => {
    const price = item.numericPrice || parseFloat(String(item.price || 0).replace(/[^0-9.]/g, '')) || 0;
    return acc + price * (item.quantity || 1);
  }, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * 0.18;
  const shipping = discountedSubtotal > 0 ? 10 : 0;
  const total = discountedSubtotal + tax + shipping;

  const handleApplyPromo = async () => {
    if (!promoCode || !cartItems.length) return;
    setIsVerifyingPromo(true);
    try {
      const res = await apiClient.post<any>('/offers/validate', {
        code: promoCode,
        garageId: cartItems[0].garageId,
        subtotal
      });
      if (res.isValid) {
        setDiscountPercent(res.discount);
        setPromoCodeApplied(promoCode);
        setPromoErrorMsg(null);
      } else {
        setPromoErrorMsg(res.message || 'This promo code is invalid or has expired.');
        setDiscountPercent(0);
        setPromoCodeApplied('');
      }
    } catch (e: any) {
      setPromoErrorMsg(e.message || 'This promo code is invalid or has expired.');
      setDiscountPercent(0);
      setPromoCodeApplied('');
    } finally {
      setIsVerifyingPromo(false);
    }
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | undefined>();
  const [isPaymentSelectionOpen, setIsPaymentSelectionOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'cod'>('online');

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) return;
    setErrorMsg(null);
    setStep('checkout');
  };

  const handlePlaceOrderClick = () => {
    if (!address.name || !address.phone || !address.street || !address.zip) {
      setErrorMsg("Please fill in all shipping address fields.");
      window.scrollTo(0, 0);
      return;
    }
    setErrorMsg(null);
    setIsPaymentSelectionOpen(true);
  };

  const processPayment = async (method: 'online' | 'cod') => {
    setIsPaymentSelectionOpen(false);
    setIsProcessing(true);
    
    try {
      if (!address.name || !address.phone || !address.street || !address.zip) {
        throw new Error("Please fill in all shipping address fields.");
      }

      const garageId = cartItems[0].garageId;
      if (!garageId) throw new Error("Items are missing garage information");
      
      const checkoutSessionId = (window as any)._cartCheckoutSessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      (window as any)._cartCheckoutSessionId = checkoutSessionId;

      const payload = {
        garageId,
        shippingAddress: { 
          name: address.name,
          phone: address.phone,
          street: address.street,
          city: address.city, 
          state: address.state,
          zip: address.zip, 
          country: 'India' 
        },
        offerCode: promoCodeApplied || undefined,
        items: cartItems.map(i => ({
          productId: i.id,
          quantity: i.quantity || 1
        })),
        paymentMethod: method,
        checkoutSessionId
      };

      // 1. Create Order
      const orderRes = await apiClient.post<any>('/orders', payload);
      
      if (method === 'cod') {
        setCompletedOrder({
          id: orderRes.orderId,
          orderNumber: orderRes.orderNumber,
          total: orderRes.total,
          paymentMethod: 'cod',
          transactionId: undefined
        });
        setSelectedPaymentMethod('cod');
        setPaymentTransactionId(undefined);
        setIsCheckoutModalOpen(true);
        updateCart([]);
        return;
      }
      
      // 2. Init Payment (Online)
      const payRes = await apiClient.post<any>(`/orders/${orderRes.orderId}/pay`, {});
      
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay script failed to load");
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock123',
        amount: payRes.amount,
        currency: payRes.currency,
        name: 'WrectifAI Shop',
        description: 'Order Payment',
        order_id: payRes.providerOrderId,
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay using UPI',
                instruments: [
                  { method: 'upi' }
                ]
              },
              card: {
                name: 'Pay using Card',
                instruments: [
                  { method: 'card' }
                ]
              }
            },
            sequence: ['block.upi', 'block.card'],
            preferences: { show_default_blocks: false }
          }
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await apiClient.post<any>('/orders/verify-payment', {
              orderId: orderRes.orderId,
              providerOrderId: response.razorpay_order_id,
              providerPaymentId: response.razorpay_payment_id,
              providerSignature: response.razorpay_signature
            });
            setCompletedOrder({
              id: verifyRes.orderId || orderRes.orderId,
              orderNumber: verifyRes.orderNumber || orderRes.orderNumber,
              total: verifyRes.amount ?? orderRes.total,
              paymentMethod: 'online',
              transactionId: response.razorpay_payment_id
            });
            setSelectedPaymentMethod('online');
            setPaymentTransactionId(response.razorpay_payment_id);
            setIsCheckoutModalOpen(true);
            updateCart([]);
          } catch (err) {
            console.error('Verification failed', err);
            setErrorMsg('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: address.name,
          email: 'customer@example.com',
          contact: address.phone
        },
        theme: {
          color: '#1a56db'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed', response.error);
        setErrorMsg('Payment failed. Please try again.');
      });
      
      rzp.open();
    } catch (err: any) {
      console.error('Checkout failed', err);
      setErrorMsg(err.message || 'Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardShell>
      <TopNavbar />
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => step === 'checkout' ? setStep('cart') : router.back()} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">{step === 'checkout' ? 'Checkout' : 'Your Cart'}</h1>
        </div>

        {errorMsg && (
          <div className="rounded-[12px] bg-red-50 p-4 border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 leading-relaxed font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            {step === 'cart' ? (
              <>
                {cartItems.length === 0 ? (
                  <Card className="p-8 text-center bg-white border-slate-100 rounded-[20px] shadow-sm">
                    <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Your cart is empty</h3>
                    <p className="text-slate-500 mb-6">Looks like you haven&apos;t added any items to your cart yet.</p>
                    <Button onClick={() => router.push('/shop')}>Continue Shopping</Button>
                  </Card>
                ) : (
                  cartItems.map((item) => (
                    <Card key={item.id} className="p-4 flex flex-col sm:flex-row items-center gap-4 bg-white border-slate-100 rounded-[20px] shadow-sm">
                      <div className="w-24 h-24 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                        {item.img ? (
                          <Image src={item.img} alt={item.name} width={80} height={80} className="object-contain" />
                        ) : (
                          <ShoppingBag className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{item.name}</h4>
                        <p className="text-sm text-slate-500 mb-2">{item.category}</p>
                        <div className="text-sm font-medium text-slate-500">{formatCurrencyForCity(item.numericPrice || 0, userCity)} each</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrencyForCity((item.numericPrice || 0) * (item.quantity || 1), userCity)}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-3 border border-slate-200 rounded-full px-3 py-1">
                            <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-500 hover:text-slate-900 font-bold">-</button>
                            <span className="font-medium w-4 text-center">{item.quantity || 1}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-500 hover:text-slate-900 font-bold">+</button>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => removeItem(item.id)} className="text-red-500 border-red-100 hover:bg-red-50 p-2">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 bg-white border-slate-100 rounded-[20px] shadow-sm">
                  <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-600"/> Delivery Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Full Name *" value={address.name} onChange={e => setAddress({...address, name: e.target.value})} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required />
                      <input type="text" placeholder="Phone Number *" value={address.phone} onChange={e => setAddress({...address, phone: e.target.value})} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required />
                    </div>
                    <input type="text" placeholder="Street Address *" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="City *" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required />
                      <input type="text" placeholder="ZIP *" value={address.zip} onChange={e => setAddress({...address, zip: e.target.value})} className="w-full text-sm rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" required />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white border-slate-100 rounded-[20px] shadow-sm">
                  <h3 className="font-bold text-lg text-slate-900 mb-4">Order Review</h3>
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                        <div className="flex-1 pr-4">
                          <p className="text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">Qty: {item.quantity || 1}</p>
                        </div>
                        <span className="text-sm font-bold">{formatCurrencyForCity((item.numericPrice || 0) * (item.quantity || 1), userCity)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>

          <div className="lg:w-80 shrink-0 space-y-4">
            {step === 'checkout' && (
              <Card className="p-6 bg-white border-slate-100 rounded-[20px] shadow-sm">
                <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2"><Tag className="w-5 h-5 text-blue-600"/> Promo Code</h3>
                {promoCodeApplied ? (
                  <div className="flex items-center justify-between bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm border border-green-100">
                    <span className="font-bold">{promoCodeApplied}</span>
                    <span>{discountPercent}% OFF</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="text" placeholder="Enter code" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} className="flex-1 text-sm rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
                    <Button onClick={handleApplyPromo} disabled={isVerifyingPromo || !promoCode} className="px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800" size="sm">
                      {isVerifyingPromo ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Apply'}
                    </Button>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-6 bg-white border-slate-100 rounded-[20px] shadow-sm sticky top-24">
              <h3 className="font-bold text-lg text-slate-900 mb-6">Order Summary</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">{formatCurrencyForCity(subtotal, userCity)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discountPercent}%)</span>
                    <span className="font-medium">-{formatCurrencyForCity(discountAmount, userCity)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax (18%)</span>
                  <span className="font-medium">{formatCurrencyForCity(tax, userCity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-medium">{formatCurrencyForCity(shipping, userCity)}</span>
                </div>
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-xl text-blue-600">{formatCurrencyForCity(total, userCity)}</span>
                </div>
              </div>
              {step === 'cart' ? (
                <Button onClick={handleProceedToCheckout} disabled={cartItems.length === 0 || isProcessing} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Proceed to Checkout'}
                </Button>
              ) : (
                <Button onClick={handlePlaceOrderClick} disabled={cartItems.length === 0 || isProcessing} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Place Order'}
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>

      <PaymentSuccessModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Order Placed Successfully!"
        description={completedOrder?.paymentMethod === 'cod' 
          ? "Your order has been placed and will be delivered to you. Payment Method: Cash on Delivery"
          : "Your payment was successful and your order has been placed."}
        amount={completedOrder?.total ?? 0}
        paymentMethod={completedOrder?.paymentMethod === 'cod' ? 'cash' : 'online'}
        transactionId={completedOrder?.paymentMethod === 'cod' ? undefined : (completedOrder?.transactionId || paymentTransactionId)}
        primaryActionLabel="View Order"
        onPrimaryAction={() => {
          setIsCheckoutModalOpen(false);
          if (completedOrder?.id) {
            router.push(`/orders/${completedOrder.id}`);
          } else {
            router.push('/orders');
          }
        }}
      />

      <Modal
        isOpen={isPaymentSelectionOpen}
        onClose={() => setIsPaymentSelectionOpen(false)}
        title="Choose Payment Method"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div 
            className={`p-4 border rounded-xl cursor-pointer hover:border-blue-500 transition-colors ${selectedPaymentMethod === 'online' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
            onClick={() => setSelectedPaymentMethod('online')}
          >
            <h4 className="font-bold text-slate-900">Online Payment</h4>
            <p className="text-sm text-slate-500">Pay securely with UPI, Credit/Debit Card or Netbanking</p>
          </div>
          
          <div 
            className={`p-4 border rounded-xl cursor-pointer hover:border-blue-500 transition-colors ${selectedPaymentMethod === 'cod' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
            onClick={() => setSelectedPaymentMethod('cod')}
          >
            <h4 className="font-bold text-slate-900">Cash on Delivery</h4>
            <p className="text-sm text-slate-500">Pay when your order is delivered to your doorstep</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsPaymentSelectionOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => processPayment(selectedPaymentMethod)}>
              Place Order
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!promoErrorMsg}
        onClose={() => setPromoErrorMsg(null)}
        title="Offer Not Valid"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {promoErrorMsg}
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => setPromoErrorMsg(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6"
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}

export default CartPage;

