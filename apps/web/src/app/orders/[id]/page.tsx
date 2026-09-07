import { Suspense } from 'react';
import { OrderDetailsPage } from '@/components/orders/order-details-page';

export default async function AppOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading order details...</div>}>
      <OrderDetailsPage orderId={id} />
    </Suspense>
  );
}
