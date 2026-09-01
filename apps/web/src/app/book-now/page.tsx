import { Suspense } from 'react';
import BookNowPage from '@/pages/bookings/book-now-page';

export default function BookNowRoute() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookNowPage />
    </Suspense>
  );
}
