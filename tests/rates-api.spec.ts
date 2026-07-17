import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/stellar/server-rates', () => ({
  fetchCorridorRates: vi.fn().mockResolvedValue({ rates: [], errors: [] }),
}));

import { GET } from '@/app/api/rates/[corridor]/route';

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe('GET /api/rates/[corridor]', () => {
  it('sets a 15s shared cache with 60s stale-while-revalidate on a successful response', async () => {
    const res = await GET(makeRequest('http://localhost/api/rates/usdc-ngn?amount=100'), {
      params: { corridor: 'usdc-ngn' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=15, stale-while-revalidate=60');
  });

  it('does not cache a 400 response for an invalid corridor', async () => {
    const res = await GET(makeRequest('http://localhost/api/rates/not-a-corridor'), {
      params: { corridor: 'not-a-corridor' },
    });

    expect(res.status).toBe(400);
    expect(res.headers.get('Cache-Control')).not.toBe(
      'public, max-age=15, stale-while-revalidate=60'
    );
  });
});
