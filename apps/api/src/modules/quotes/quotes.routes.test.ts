import { test, mock } from 'node:test';
import assert from 'node:assert';
import { Pool } from 'pg';

let dbQueryResults: MockQueryResults = {};

mock.method(Pool.prototype, 'query', async (text: string) => {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('select') && lowerText.includes('quotes')) {
    if (lowerText.includes('where q.id = $1')) {
      const mockQuote = dbQueryResults.quote;
      return { rows: mockQuote ? [mockQuote] : [] };
    }
    return { rows: dbQueryResults.quotes || [] };
  }

  if (lowerText.includes('select status from users')) {
    return { rows: [{ status: 'active' }] };
  }

  if (lowerText.includes('select r.code from roles')) {
    return { rows: [{ code: 'customer' }] };
  }

  return { rows: [] };
});

import express, { Request, Response } from 'express';
import { quotesRouter } from './quotes.routes';
import { generateAccessToken } from '../../services/jwt.service';

interface MockQueryResults {
  quotes?: Array<Record<string, unknown>>;
  quote?: Record<string, unknown>;
}

const token = generateAccessToken({
  userId: 'test-user-uuid',
  email: 'test@wrectifai.com',
  name: 'Test Tester',
  roles: ['customer'],
});

const app = express();
app.use(express.json());
app.use('/quotes', quotesRouter);

interface QuoteListItem {
  id: string;
  garage: string;
  price: string;
  savings: string;
  status: string;
  details: Record<string, unknown>;
  [key: string]: unknown;
}

interface QuoteDetailItem {
  id: string;
  garage: string;
  price: string;
  savings: string;
  status: string;
  details: Record<string, unknown>;
  [key: string]: unknown;
}

interface QuoteListResponse { data: QuoteListItem[] }
interface QuoteDetailResponse { data: QuoteDetailItem }
interface QuoteEmptyResponse { data: null }
type QuoteApiResponse = QuoteListResponse | QuoteDetailResponse | QuoteEmptyResponse;

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  setHeader(name: string, value: string): void;
  status(code: number): MockResponse;
  json(data: QuoteApiResponse): void;
  send(data: QuoteApiResponse): void;
  end(): void;
}

function request<T extends QuoteApiResponse = QuoteApiResponse>(method: string, path: string, body?: unknown): Promise<{ status: number; body: T }> {
  return new Promise((resolve) => {
    const req = {
      method,
      url: path,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`
      },
      body,
    } as Pick<Request, 'method' | 'url' | 'headers' | 'body'>;

    const res: MockResponse = {
      statusCode: 200,
      headers: {},
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: QuoteApiResponse) {
        resolve({ status: this.statusCode, body: data as T });
      },
      send(data: QuoteApiResponse) {
        resolve({ status: this.statusCode, body: data as T });
      },
      end() {
        resolve({ status: this.statusCode, body: { data: null } as T });
      },
    };

    (app as unknown as { handle: (req: Request, res: Response) => void }).handle(req as Request, res as unknown as Response);
  });
}

test('quotes routes - GET /quotes returns mapped quotes', async () => {
  const mockQuotesList = [
    {
      id: 'mock-quote-uuid-1',
      quoteRequestId: 'qr-1',
      amount: 3050.00,
      currency: 'INR',
      etaDays: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      details: {
        ui_status: 'new',
        parts: 1650,
        labour: 1050,
        consumables: 200,
        gst: 150,
        availability: 'Today, 6:00 PM',
        pickup_drop: 'Available',
        warranty: '6 Months / 10,000 km',
        experience: '8+ Years',
        savings: 450,
      },
      garageName: 'QuickPit Service Center',
      ratingAvg: 4.6,
      ratingCount: 128,
      pickupDropSupported: true,
    },
  ];
  dbQueryResults = { quotes: mockQuotesList };

  const response = await request<QuoteListResponse>('GET', '/quotes');

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.length, 1);
  assert.strictEqual(response.body.data[0].garage, 'QuickPit Service Center');
  assert.strictEqual(response.body.data[0].price, '3050');
  assert.strictEqual(response.body.data[0].savings, 450);
});

test('quotes routes - GET /quotes/:id returns quote details', async () => {
  dbQueryResults = {
    quote: {
      id: 'mock-quote-uuid-1',
      quoteRequestId: 'qr-1',
      amount: 3050.00,
      currency: 'USD',
      etaDays: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      details: {
        ui_status: 'new',
        parts: 1650,
        labour: 1050,
        consumables: 200,
        gst: 150,
        availability: 'Today, 6:00 PM',
        pickup_drop: 'Available',
        warranty: '6 Months / 10,000 km',
        experience: '8+ Years',
        savings: 450,
      },
      requestCustomerId: 'test-user-uuid',
      garageName: 'QuickPit Service Center',
      ratingAvg: 4.6,
      ratingCount: 128,
      pickupDropSupported: true,
    },
  };

  const response = await request<QuoteDetailResponse>('GET', '/quotes/mock-quote-uuid-1');

  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.data.id, 'mock-quote-uuid-1');
  assert.strictEqual(response.body.data.details.parts, 1650);
});
