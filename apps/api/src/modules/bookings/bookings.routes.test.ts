import { test, mock } from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';

let dbQueryResults: any = { rows: [] };
let lastQueryText = '';
let lastQueryParams: any[] = [];
let existingVehicleBookingStatus: string | null = null;
let existingSameDayAppointment = false;
let insertedBookingCount = 0;
let lastIncomingBookingsQuery = '';

const mockedQuery = async (text: string, params?: any[]) => {
  lastQueryText = text;
  lastQueryParams = params || [];

  const lowerText = text.toLowerCase();

  if (lowerText.includes('from bookings b') && lowerText.includes('customeravatar')) {
    lastIncomingBookingsQuery = text;
  }

  if (lowerText.includes('pg_advisory_xact_lock')) return { rows: [] };

  if (lowerText.includes('from bookings') && lowerText.includes("status in ('in_progress', 'readyforcollection')")) {
    return { rows: ['in_progress', 'readyForCollection'].includes(existingVehicleBookingStatus || '') ? [{ id: 'active-job' }] : [] };
  }

  if (lowerText.includes('from bookings') && lowerText.includes("status in ('requested', 'confirmed')")) {
    return { rows: existingSameDayAppointment ? [{ id: 'same-day-appointment' }] : [] };
  }

  if (lowerText.includes('payment_status, customer_id') || lowerText.includes('for update')) {
    return { rows: [{ payment_status: 'unpaid', customer_id: 'test-user-uuid', old_status: 'in_progress', total_amount: 150.0, currency: 'INR' }] };
  }

  if (lowerText.includes('select id from vehicles where id =')) {
    return { rows: [{ id: 'v1' }] };
  }

  if (lowerText.includes('select approval_status, name')) {
    return { rows: [{ approval_status: 'approved', name: 'Test Garage', business_hours: null, business_currency: 'INR' }] };
  }

  if (lowerText.includes('select') && lowerText.includes('bookings')) {
    if (lowerText.includes('where b.id =')) {
      return { rows: dbQueryResults.booking ? [dbQueryResults.booking] : [] };
    }
    return { rows: dbQueryResults.bookings || [] };
  }

  if (text.includes('INSERT INTO bookings')) {
    insertedBookingCount++;
    return {
      rows: [
        {
          id: 'mock-booking-uuid-123',
          customerId: params?.[0],
          garageId: params?.[1],
          vehicleId: params?.[2],
          quoteId: params?.[3],
          bookingType: params?.[4],
          scheduledAt: params?.[5],
          status: params?.[6],
          totalAmount: params?.[8],
          currency: params?.[9] || 'USD',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  if (text.includes('UPDATE bookings')) {
    const statusParam = params?.find(p => ['requested', 'confirmed', 'in_progress', 'completed', 'readyForCollection', 'collected', 'cancelled'].includes(p));
    return {
      rows: [
        {
          id: params?.[0], // bookingId
          status: statusParam || 'completed',
          updatedAt: new Date().toISOString(),
        },
      ],
    };
  }

  if (text.includes('SELECT garage_id FROM quotes')) {
    return {
      rows: [
        {
          garage_id: 'mock-garage-uuid',
        },
      ],
    };
  }

  if (text.includes('UPDATE quotes')) {
    return { rows: [] };
  }

  if (lowerText.includes('current_garage.id as garage_id')) {
    return { rows: [{ status: 'active', roles: ['customer', 'garage'], garage_id: 'g1' }] };
  }

  if (lowerText.includes('select status from users')) {
    return { rows: [{ status: 'active' }] };
  }

  if (lowerText.includes('select r.code from roles')) {
    return { rows: [{ code: 'garage' }] };
  }

  return { rows: [] };
};

mock.method(Pool.prototype, 'query', mockedQuery);
mock.method(Pool.prototype, 'connect', async () => ({ query: mockedQuery, release: () => undefined } as any));

import express from 'express';
import { bookingsRouter } from './bookings.routes';
import { generateAccessToken } from '../../services/jwt.service';

const token = generateAccessToken({
  userId: 'test-user-uuid',
  email: 'test@wrectifai.com',
  name: 'Test Tester',
  roles: ['customer', 'garage'],
  garageId: 'g1',
});

const app = express();
app.use(express.json());
app.use('/bookings', bookingsRouter);

function request(method: string, path: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method,
      url: path,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
      },
      body,
    };

    const res: any = {
      statusCode: 200,
      headers: {},
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: this.statusCode, body: data });
      },
      send(data: any) {
        resolve({ status: this.statusCode, body: data });
      },
      end() {
        resolve({ status: this.statusCode, body: null });
      },
    };

    (app as any).handle(req, res);
  });
}

test('bookings routes - GET /bookings returns list', async () => {
  dbQueryResults = {
    bookings: [
      {
        id: 'b1',
        customerId: 'test-user-uuid',
        garageId: 'g1',
        vehicleId: 'v1',
        bookingType: 'instant',
        scheduledAt: new Date().toISOString(),
        status: 'confirmed',
        totalAmount: '150.00',
        currency: 'USD',
        garageName: 'Test Garage',
        vehicleMake: 'Honda',
      },
    ],
  };

  const response = await request('GET', '/bookings');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.length, 1);
  assert.strictEqual(response.body.data[0].garageName, 'Test Garage');
  assert.strictEqual(response.body.data[0].totalAmount, 150.0);
});

test('garage incoming bookings returns only unaccepted requests and uses existing profile columns', async () => {
  lastIncomingBookingsQuery = '';
  dbQueryResults = {
    bookings: [{ id: 'pending-booking', status: 'requested', customerName: 'Test Customer' }],
  };

  const response = await request('GET', '/bookings/garage-incoming');

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.length, 1);
  assert.match(lastIncomingBookingsQuery, /b\.status = 'requested'/i);
  assert.match(lastIncomingBookingsQuery, /g\.owner_user_id = \$1/i);
  assert.strictEqual(lastQueryParams[0], 'test-user-uuid');
  assert.doesNotMatch(lastIncomingBookingsQuery, /avatar_url/i);
});

test('bookings routes - GET /bookings/:id returns single booking', async () => {
  dbQueryResults = {
    booking: {
      id: 'b1',
      customerId: 'test-user-uuid',
      garageId: 'g1',
      vehicleId: 'v1',
      bookingType: 'instant',
      scheduledAt: new Date().toISOString(),
      status: 'confirmed',
      totalAmount: '150.00',
      currency: 'USD',
      garageName: 'Test Garage',
      vehicleMake: 'Honda',
    },
  };

  const response = await request('GET', '/bookings/b1');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.id, 'b1');
  assert.strictEqual(response.body.data.totalAmount, 150.0);
});

test('bookings routes - POST /bookings creates an instant booking', async () => {
  existingVehicleBookingStatus = null;
  const payload = {
    garageId: 'g1',
    vehicleId: 'v1',
    scheduledAt: new Date().toISOString(),
    totalAmount: 150.0,
    bookingType: 'instant',
  };

  const response = await request('POST', '/bookings', payload);
  assert.strictEqual(response.status, 201);
  assert.strictEqual(response.body.data.id, 'mock-booking-uuid-123');
  assert.strictEqual(response.body.data.bookingType, 'instant');
});

function bookingPayload(scheduledAt: string, extra: Record<string, unknown> = {}) {
  return {
    garageId: 'g1',
    vehicleId: 'v1',
    scheduledAt,
    totalAmount: 150,
    bookingType: 'instant',
    ...extra,
  };
}

test('active in-progress vehicle is blocked even when the requested appointment is on another day', async () => {
  existingVehicleBookingStatus = 'in_progress';
  const response = await request('POST', '/bookings', bookingPayload('2030-05-12T17:00:00+05:30'));
  assert.strictEqual(response.status, 409);
  assert.strictEqual(response.body.error.code, 'ACTIVE_VEHICLE_BOOKING');
  assert.match(response.body.error.message, /active service booking/i);
});

test('vehicle ready for collection remains blocked until its persisted status becomes collected', async () => {
  existingVehicleBookingStatus = 'readyForCollection';
  const blocked = await request('POST', '/bookings', bookingPayload('2030-05-12T17:00:00+05:30'));
  assert.strictEqual(blocked.status, 409);

  existingVehicleBookingStatus = 'collected';
  const released = await request('POST', '/bookings', bookingPayload('2030-05-12T17:00:00+05:30'));
  assert.strictEqual(released.status, 201);
});

test('cancelled bookings do not block a new booking', async () => {
  existingVehicleBookingStatus = 'cancelled';
  const response = await request('POST', '/bookings', bookingPayload('2030-05-12T17:00:00+05:30'));
  assert.strictEqual(response.status, 201);
});

test('old completed bookings do not block a new booking', async () => {
  existingVehicleBookingStatus = 'completed';
  const response = await request('POST', '/bookings', bookingPayload('2030-05-12T17:00:00+05:30'));
  assert.strictEqual(response.status, 201);
});

test('requesting another service while a vehicle is active cannot create a second booking', async () => {
  existingVehicleBookingStatus = 'in_progress';
  const before = insertedBookingCount;
  const response = await request('POST', '/bookings', bookingPayload('2030-05-12T17:00:00+05:30', { serviceIds: ['additional-service'] }));
  assert.strictEqual(response.status, 409);
  assert.strictEqual(insertedBookingCount, before);
});

test('same-day appointment conflict remains, while another date is allowed before service starts', async () => {
  existingVehicleBookingStatus = null;
  existingSameDayAppointment = true;
  const sameDay = await request('POST', '/bookings', bookingPayload('2030-05-12T17:00:00+05:30'));
  assert.strictEqual(sameDay.status, 409);

  existingSameDayAppointment = false;
  const otherDay = await request('POST', '/bookings', bookingPayload('2030-05-13T17:00:00+05:30'));
  assert.strictEqual(otherDay.status, 201);
});

test('bookings routes - PATCH /bookings/:id/status updates status', async () => {
  const validUuid = '12345678-1234-1234-1234-123456789012';
  const response = await request('PATCH', `/bookings/${validUuid}/status`, { status: 'completed' });
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.status, 'completed');
});
