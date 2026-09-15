import { test, mock } from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';

let dbQueryResults: any = { rows: [] };
let lastQueryText = '';
let lastQueryParams: any[] = [];

mock.method(Pool.prototype, 'query', async (text: string, params?: any[]) => {
  lastQueryText = text;
  lastQueryParams = params || [];

  const lowerText = text.toLowerCase();

  if (lowerText.includes('select') && lowerText.includes('vehicles')) {
    // Specifically match ' id = $1' or ' id = $7' or 'where id =' to avoid matching 'customer_id'
    if (lowerText.includes(' id = $1') || lowerText.includes(' id = $7') || lowerText.includes('where id =')) {
      // Find single vehicle mock
      const mockVehicle = dbQueryResults.vehicle;
      return { rows: mockVehicle ? [mockVehicle] : [] };
    }
    // List vehicles mock
    return { rows: dbQueryResults.vehicles || [] };
  }

  if (text.includes('INSERT INTO vehicles')) {
    return {
      rows: [
        {
          id: 'mock-vehicle-uuid-1',
          customerId: params?.[0],
          make: params?.[1],
          model: params?.[2],
          year: params?.[3],
          vin: params?.[4],
          mileage: params?.[5],
          warranty: params?.[6],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
  }

  if (text.includes('UPDATE vehicles')) {
    return {
      rows: [
        {
          id: params?.[params.length - 1], // target id is last param
          customerId: 'test-user-uuid',
          make: params?.[0] || 'Toyota',
          model: params?.[1] || 'Corolla',
          year: params?.[2] || 2020,
          vin: params?.[3],
          mileage: params?.[4],
          warranty: params?.[5],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
  }

  if (lowerText.includes('select status from users')) {
    return { rows: [{ status: 'active' }] };
  }

  if (lowerText.includes('select r.code from roles')) {
    return { rows: [{ code: 'customer' }] };
  }

  return { rows: [] };
});

import express from 'express';
import { vehiclesRouter } from './vehicles.routes';
import { generateAccessToken } from '../../services/jwt.service';

const token = generateAccessToken({
  userId: 'test-user-uuid',
  email: 'test@wrectifai.com',
  name: 'Test Tester',
  roles: ['customer'],
});

const app = express();
app.use(express.json());
app.use('/vehicles', vehiclesRouter);

function request(method: string, path: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method,
      url: path,
      headers: { 
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`
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

test('vehicles routes - GET /vehicles lists user\'s active vehicles', async () => {
  const mockVehiclesList = [
    {
      id: 'mock-vehicle-uuid-1',
      customerId: 'test-user-uuid',
      make: 'Toyota',
      model: 'RAV4',
      year: 2021,
      is_active: true,
    },
  ];
  dbQueryResults = { vehicles: mockVehiclesList };

  const response = await request('GET', '/vehicles');

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.length, 1);
  assert.strictEqual(response.body.data[0].make, 'Toyota');
  assert.strictEqual(response.body.data[0].customerId, 'test-user-uuid');
});

test('vehicles routes - POST /vehicles adds a vehicle', async () => {
  const response = await request('POST', '/vehicles', {
    make: 'Honda',
    model: 'Civic',
    year: 2022,
    vin: '1HGCP2F83JAXXXXXX',
    mileage: 15000,
  });

  assert.strictEqual(response.status, 201);
  assert.strictEqual(response.body.data.make, 'Honda');
  assert.strictEqual(response.body.data.model, 'Civic');
  assert.strictEqual(response.body.data.customerId, 'test-user-uuid');
});

test('vehicles routes - GET /vehicles/:id returns vehicle details for owner', async () => {
  dbQueryResults = {
    vehicle: {
      id: 'mock-vehicle-uuid-1',
      customerId: 'test-user-uuid',
      make: 'Toyota',
      model: 'RAV4',
      year: 2021,
      is_active: true,
    },
  };

  const response = await request('GET', '/vehicles/mock-vehicle-uuid-1');

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.id, 'mock-vehicle-uuid-1');
  assert.strictEqual(response.body.data.make, 'Toyota');
});

test('vehicles routes - GET /vehicles/:id returns 403 Forbidden for non-owner', async () => {
  dbQueryResults = {
    vehicle: {
      id: 'mock-vehicle-uuid-1',
      customerId: 'another-user-uuid',
      make: 'Toyota',
      model: 'RAV4',
      year: 2021,
      is_active: true,
    },
  };

  const response = await request('GET', '/vehicles/mock-vehicle-uuid-1');

  assert.strictEqual(response.status, 403);
});

test('vehicles routes - PATCH /vehicles/:id returns 403 Forbidden for non-owner', async () => {
  dbQueryResults = {
    vehicle: {
      id: 'mock-vehicle-uuid-1',
      customerId: 'another-user-uuid',
      make: 'Toyota',
      model: 'RAV4',
      year: 2021,
      is_active: true,
    },
  };

  const response = await request('PATCH', '/vehicles/mock-vehicle-uuid-1', {
    make: 'Hack Attempt',
  });

  assert.strictEqual(response.status, 403);
});

