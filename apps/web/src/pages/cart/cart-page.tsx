'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { useRouter } from 'next/navigation';
import { Trash2, ShoppingBag, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { Modal } from '@/components/common/modal';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { TopNavbar } from '@/components/home/top-navbar';

export function CartPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  useEffect(() => {
    const items = localStorage.getItem('shopCart');
    if (items) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCartItems(JSON.parse(items));
    }
  }, []);

  const updateCart = (newItems: any[]) => {
    setCartItems(newItems);
    localStorage.setItem('shopCart', JSON.stringify(newItems));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const updateQuantity = (id: number, delta: number) => {
    const newItems = cartItems.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) };
      }
      return item;
    });
    updateCart(newItems);
  };

  const removeItem = (id: number) => {
    const newItems = cartItems.filter(item => item.id !== id);
    updateCart(newItems);
  };

  const subtotal = cartItems.reduce((acc, item) => {
    const price = parseFloat(item.price.replace('$', ''));
    return acc + price * (item.quantity || 1);
  }, 0);
  const tax = subtotal * 0.1;
  const shipping = subtotal > 0 ? 15 : 0;
  const total = subtotal + tax + shipping;

  const handleCheckout = () => {
    setIsCheckoutModalOpen(true);
    setTimeout(() => {
      updateCart([]);
    }, 500);
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
                    <div className="text-lg font-bold text-blue-600">{item.price}</div>
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
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax (10%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Shipping</span>
                  <span className="font-medium">${shipping.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="font-bold text-xl text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
              <Button onClick={handleCheckout} disabled={cartItems.length === 0} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3">
                Proceed to Checkout
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <Modal isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} title="Order Placed">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Checkout Successful!</h3>
          <p className="text-slate-500 mb-6">Your order has been placed successfully. You will receive an email confirmation shortly.</p>
          <Button onClick={() => { setIsCheckoutModalOpen(false); router.push('/shop'); }} className="w-full">
            Continue Shopping
          </Button>
        </div>
      </Modal>
    </DashboardShell>
  );
}

export default CartPage;
