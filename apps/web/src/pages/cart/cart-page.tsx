'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingBag, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { PaymentSuccessModal } from '@/components/common/payment-success-modal';
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
  const tax = subtotal * 0.18;
  const shipping = subtotal > 0 ? 10 : 0;
  const total = subtotal + tax + shipping;

  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [paymentTransactionId, setPaymentTransactionId] = useState<string | undefined>();

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

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    setErrorMsg(null);
    setIsProcessing(true);
    
    try {
      const garageId = cartItems[0].garageId;
      if (!garageId) throw new Error("Items are missing garage information");
      
      const payload = {
        garageId,
        shippingAddress: { city: 'Bengaluru', zip: '560001', country: 'India' },
        items: cartItems.map(i => ({
          productId: i.id,
          quantity: i.quantity || 1
        }))
      };

      // 1. Create Order
      const orderRes = await apiClient.post<any>('/orders', payload);
      
      // 2. Init Payment
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
            await apiClient.post('/orders/verify-payment', {
              orderId: orderRes.orderId,
              providerOrderId: response.razorpay_order_id,
              providerPaymentId: response.razorpay_payment_id,
              providerSignature: response.razorpay_signature
            });
            setCompletedOrder(orderRes);
            setPaymentTransactionId(response.razorpay_payment_id);
            setIsCheckoutModalOpen(true);
            updateCart([]);
          } catch (err) {
            console.error('Verification failed', err);
            setErrorMsg('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: 'Customer',
          email: 'customer@example.com',
          contact: '9999999999'
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
          <Button variant="outline" size="sm" onClick={() => router.back()} className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>
        </div>

        {errorMsg && (
          <div className="rounded-[12px] bg-red-50 p-4 border border-red-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 leading-relaxed font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            {cartItems.length === 0 ? (
              <Card className="p-8 text-center bg-white border-slate-100 rounded-[20px] shadow-sm">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Your cart is empty</h3>
                <p className="text-slate-500 mb-6">Looks like you haven&apos;t added any items to your cart yet.</p>
                <Button onClick={() => router.push('/shop-all')}>Continue Shopping</Button>
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
                    <div className="text-lg font-bold text-blue-600">{item.formattedPrice || formatCurrencyForCity(item.numericPrice || 0, userCity)}</div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className="flex items-center gap-3 border border-slate-200 rounded-full px-3 py-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-500 hover:text-slate-900 font-bold">-</button>
                      <span className="font-medium w-4 text-center">{item.quantity || 1}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-500 hover:text-slate-900 font-bold">+</button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => removeItem(item.id)} className="text-red-500 border-red-100 hover:bg-red-50 p-2">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="lg:w-80 shrink-0">
            <Card className="p-6 bg-white border-slate-100 rounded-[20px] shadow-sm sticky top-24">
              <h3 className="font-bold text-lg text-slate-900 mb-6">Order Summary</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">{formatCurrencyForCity(subtotal, userCity)}</span>
                </div>
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
              <Button onClick={handleCheckout} disabled={cartItems.length === 0 || isProcessing} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 flex items-center justify-center gap-2">
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Proceed to Checkout'}
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <PaymentSuccessModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="Order Placed Successfully"
        description="Your order has been placed successfully. You will receive an email confirmation shortly."
        amount={total}
        paymentMethod="online"
        transactionId={paymentTransactionId}
        primaryActionLabel="View Invoice"
        onPrimaryAction={() => {
          setIsCheckoutModalOpen(false);
          if (completedOrder) {
            router.push(`/invoices/${completedOrder.orderId}?type=order`);
          } else {
            router.push('/shop');
          }
        }}
      />
    </DashboardShell>
  );
}

export default CartPage;

