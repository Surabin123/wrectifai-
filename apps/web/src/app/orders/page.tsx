import { Suspense } from 'react';
import { OrdersPage } from '@/components/orders/orders-page';

export default function AppOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading orders...</div>}>
      <OrdersPage />
    </Suspense>
  );
}
