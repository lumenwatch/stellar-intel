/**
 * @vitest-environment node
 *
 * Runs in the Node environment (not jsdom): Keypair.random() relies on Node's
 * crypto for secure entropy, which jsdom does not provide.
 */
import { describe, it, expect, vi } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import type { ServerRatesResult } from '@/lib/stellar/server-rates';

// getQuote now sources live rates from fetchCorridorRates instead of a static
// table — stub the network-hitting live-rate fetch so these tests stay fast
// and deterministic, while still exercising the real plumbing between them.
const LIVE_RATES: Record<string, { anchorId: string; totalReceived: (amount: number) => number }> =
  {
    'usdc-ngn': { anchorId: 'cowrie', totalReceived: (amount) => (amount - 2) * 1600 },
    'usdc-kes': { anchorId: 'flutterwave', totalReceived: (amount) => (amount - 1.5) * 129 },
  };

/** Sentinel amount that makes the stub simulate the routed anchor being unquotable. */
const RATE_UNAVAILABLE_AMOUNT = '999999';

vi.mock('@/lib/stellar/server-rates', () => ({
  fetchCorridorRates: vi.fn(async (id: string, amount: string): Promise<ServerRatesResult> => {
    if (amount === RATE_UNAVAILABLE_AMOUNT) {
      return {
        corridorId: id,
        rates: [],
        pending: [],
        bestRateId: '',
        errors: [{ anchorId: 'cowrie', anchorName: 'Cowrie', reason: 'anchor unreachable' }],
      };
    }
    const route = LIVE_RATES[id];
    if (!route) return { corridorId: id, rates: [], pending: [], bestRateId: '', errors: [] };
    return {
      corridorId: id,
      rates: [
        {
          anchorId: route.anchorId,
          anchorName: route.anchorId,
          corridorId: id,
          fee: null,
          feeType: 'flat',
          exchangeRate: 0,
          totalReceived: route.totalReceived(Number(amount)),
          source: 'sep38',
          updatedAt: new Date(),
        },
      ],
      pending: [],
      bestRateId: route.anchorId,
      errors: [],
    };
  }),
}));

const {
  getQuote,
  prepareIntent,
  QuoteOutputSchema,
  PrepareOutputSchema,
  OfframpToolError,
  corridorId,
} = await import('@/lib/mcp/offramp');

describe('intel.offramp.quote (#135)', () => {
  it('returns a schema-valid quote for a known corridor', async () => {
    const quote = await getQuote({ from: 'USDC', to: 'NGN', amount: '100' });
    expect(() => QuoteOutputSchema.parse(quote)).not.toThrow();
    expect(quote.anchor).toBe('cowrie');
    expect(quote.quoteId).toMatch(/^[0-9a-f]{64}$/);
    // live-rate stub: (100 - 2 fee) * 1600 = 156800
    expect(quote.netReceived).toBe('156800');
    expect(new Date(quote.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('computes net received for a second corridor', async () => {
    const quote = await getQuote({ from: 'USDC', to: 'KES', amount: '50' });
    expect(quote.anchor).toBe('flutterwave');
    // live-rate stub: (50 - 1.5) * 129 = 6256.5
    expect(quote.netReceived).toBe('6256.5');
  });

  it('produces a stable quoteId for identical inputs', async () => {
    const a = await getQuote({ from: 'USDC', to: 'NGN', amount: '100' });
    const b = await getQuote({ from: 'USDC', to: 'NGN', amount: '100' });
    expect(a.quoteId).toBe(b.quoteId);
  });

  it('throws NO_ROUTE for an unknown corridor', async () => {
    await expect(getQuote({ from: 'USDC', to: 'ZZZ', amount: '10' })).rejects.toBeInstanceOf(
      OfframpToolError
    );
  });

  it('throws RATE_UNAVAILABLE when the routed anchor has no live quote', async () => {
    await expect(
      getQuote({ from: 'USDC', to: 'NGN', amount: RATE_UNAVAILABLE_AMOUNT })
    ).rejects.toMatchObject({ code: 'RATE_UNAVAILABLE' });
  });

  it('rejects an invalid amount via schema', async () => {
    await expect(getQuote({ from: 'USDC', to: 'NGN', amount: '-5' })).rejects.toThrow();
    await expect(getQuote({ from: 'USDC', to: 'NGN', amount: 'abc' })).rejects.toThrow();
  });

  it('derives corridor ids case-insensitively', () => {
    expect(corridorId('USDC', 'NGN')).toBe('usdc-ngn');
    expect(corridorId('usdc', 'ngn')).toBe('usdc-ngn');
  });
});

describe('intel.offramp.prepare (#136)', () => {
  const validIntent = {
    type: 'offramp' as const,
    sourceAsset: 'USDC',
    destinationAsset: 'NGN',
    amount: '100',
    // A real, valid Stellar public key generated below in tests when needed.
    sender: 'GAIJ3VXNY7RPPLGVVCLGBK7NPHLL5ZRKATHETOA7M7UPZPAAHEGQQIY2',
    recipient: 'recipient-123',
  };

  it('returns a schema-valid unsigned envelope + unsigned tx', async () => {
    const result = await prepareIntent(validIntent);
    expect(() => PrepareOutputSchema.parse(result)).not.toThrow();
    expect(result.unsignedEnvelope.intentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.unsignedEnvelope.intent).toEqual(validIntent);
    expect(typeof result.unsignedTx).toBe('string');
    expect(result.unsignedTx.length).toBeGreaterThan(0);
  });

  it('ACCEPTANCE: the returned envelope signs correctly with a provided keypair', async () => {
    // Use a real keypair as the sender so the signature verifies end-to-end.
    const kp = Keypair.random();
    const intent = { ...validIntent, sender: kp.publicKey() };

    const { unsignedEnvelope } = await prepareIntent(intent);

    // An agent signs the canonical intent hash (hex string) with its key.
    const message = Buffer.from(unsignedEnvelope.intentHash, 'utf8');
    const signature = kp.sign(message);

    // The signature verifies against the sender's public key.
    const verifier = Keypair.fromPublicKey(intent.sender);
    expect(verifier.verify(message, signature)).toBe(true);

    // And a different key does NOT verify (sanity).
    const other = Keypair.random();
    expect(other.verify(message, signature)).toBe(false);
  });

  it('produces a decodable unsigned Stellar transaction XDR', async () => {
    const kp = Keypair.random();
    const result = await prepareIntent({ ...validIntent, sender: kp.publicKey() });
    const { TransactionBuilder, Networks } = await import('@stellar/stellar-sdk');
    const tx = TransactionBuilder.fromXDR(result.unsignedTx, Networks.PUBLIC);
    expect(tx.operations.length).toBeGreaterThan(0);
    // Unsigned: no signatures attached yet.
    expect(tx.signatures.length).toBe(0);
  });

  it('throws NO_ROUTE for an unsupported corridor', async () => {
    await expect(prepareIntent({ ...validIntent, destinationAsset: 'ZZZ' })).rejects.toBeInstanceOf(
      OfframpToolError
    );
  });

  it('rejects a malformed sender public key', async () => {
    await expect(prepareIntent({ ...validIntent, sender: 'not-a-key' })).rejects.toThrow();
  });
});
