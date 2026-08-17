import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { usersRouter } from '../modules/users/users.routes';
import { vehiclesRouter } from '../modules/vehicles/vehicles.routes';
import { diagnosisRouter } from '../modules/diagnosis/diagnosis.routes';
import { diagnoseConfigRouter } from '../modules/diagnosis/diagnosis-config.routes';
import { garagesRouter } from '../modules/garages/garages.routes';
import { quotesRouter } from '../modules/quotes/quotes.routes';
import { bookingsRouter } from '../modules/bookings/bookings.routes';
import { marketplaceRouter } from '../modules/marketplace/marketplace.routes';
import { paymentsRouter } from '../modules/payments/payments.routes';
import { reviewsRouter } from '../modules/reviews/reviews.routes';
import { notificationsRouter } from '../modules/notifications/notifications.routes';
import { adminRouter } from '../modules/admin/admin.routes';
import { walletRouter } from '../modules/wallet/wallet.routes';
import { offersRouter } from '../modules/offers/offers.routes';
import { getHealthStatus } from '../services/health.service';
import { success, error } from '../utils/response';
import { query } from '../config/database';


export const apiRouter = Router();

apiRouter.get('/health', async (_req, res) => {
  const status = await getHealthStatus();
  return success(res, status);
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/vehicles', vehiclesRouter);
apiRouter.use('/diagnosis', diagnosisRouter);
apiRouter.use('/diagnose/config', diagnoseConfigRouter);
apiRouter.use('/garages', garagesRouter);
apiRouter.use('/quotes', quotesRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/marketplace', marketplaceRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/reviews', reviewsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/offers', offersRouter);
apiRouter.use('/notifications', notificationsRouter);

apiRouter.get('/debug-garages', async (req, res) => {
  const result = await query('SELECT id, name, approval_status, is_approved FROM garages');
  return res.json(result.rows);
});

apiRouter.get('/promos', async (req, res) => {
  try {
    const result = await query('SELECT * FROM promos ORDER BY relevance DESC');
    const mapped = result.rows.map((p: any) => ({
      id: p.id,
      badge: p.badge,
      icon: p.icon,
      title: p.title,
      bullets: p.bullets || [],
      numericPrice: Number(p.numeric_price),
      strikePrice: p.strike_price ? Number(p.strike_price) : undefined,
      discountPercent: p.discount_percent,
      validTill: p.valid_till,
      usedCountValue: p.used_count_value,
      image: p.image,
      categories: p.categories || [],
      isCombo: p.is_combo,
      relevance: p.relevance,
      themePreset: p.theme_preset,
    }));
    return success(res, mapped);
  } catch (err) {
    return error(
      res,
      err instanceof Error ? err.message : 'Database query failed',
      'DATABASE_ERROR',
      500
    );
  }
});

