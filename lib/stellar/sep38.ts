import { authenticate, invalidateSep10Token } from './sep10'
import { parseSepErrorBody } from './errors'
import type { ResolvedAnchor } from '@/types'

// ─── Request / response types ──────────────────────────────────────────────────

/** Parameters for a SEP-38 firm quote (POST /quote). */
export interface Sep38FirmQuoteRequest {
  /** Asset the user is selling, in SEP-38 form (e.g. "stellar:USDC:G..."). */
  sellAsset: string
  /** Asset the user wants to buy, in SEP-38 form (e.g. "iso4217:NGN"). */
  buyAsset: string
  /** Amount of sellAsset. Mutually exclusive with buyAmount. */
  sellAmount?: string
  /** Amount of buyAsset. Mutually exclusive with sellAmount. */
  buyAmount?: string
  /** Flow the quote will be used in. Defaults to the anchor's choice when omitted. */
  context?: 'sep6' | 'sep24' | 'sep31'
  sellDeliveryMethod?: string
  buyDeliveryMethod?: string
  countryCode?: string
  /** ISO-8601 timestamp the quote must remain valid until. */
  expireAfter?: string
}

/** Fee breakdown attached to a firm quote. */
export interface Sep38Fee {
  total: string
  asset: string
  details?: Array<{ name: string; amount: string; description?: string }>
}

/** A firm quote issued by an anchor's SEP-38 quote server. */
export interface Sep38FirmQuote {
  id: string
  expiresAt: Date
  price: string
  totalPrice: string
  sellAsset: string
  sellAmount: string
  buyAsset: string
  buyAmount: string
  fee?: Sep38Fee
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getQuoteServer(anchor: ResolvedAnchor): string {
  const server = anchor.ANCHOR_QUOTE_SERVER
  if (!server || !anchor.capabilities.sep38) {
    throw new Error(`Anchor "${anchor.homeDomain}" does not support SEP-38 firm quotes.`)
  }
  return server.replace(/\/+$/, '')
}

async function readErrorBody(res: Response): Promise<unknown> {
  return typeof res.json === 'function' ? await res.json().catch(() => null) : null
}

/**
 * Runs an authenticated request against the anchor, transparently refreshing the
 * SEP-10 JWT on a 401.
 *
 * The first attempt uses whatever token `authenticate` returns (cached when
 * valid). If the anchor rejects it with 401, the cached token is dropped and a
 * single fresh sign flow is run before re-attempting exactly once. A second 401
 * is surfaced to the caller rather than looping.
 */
async function authenticatedRequest(
  anchor: ResolvedAnchor,
  publicKey: string,
  url: string,
  init: RequestInit
): Promise<Response> {
  const withAuth = (jwt: string): RequestInit => ({
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${jwt}` },
  })

  const { jwt } = await authenticate(anchor, publicKey)
  const res = await fetch(url, withAuth(jwt))

  if (res.status !== 401) return res

  // Token was stale/revoked — drop it and re-authenticate once, then retry.
  invalidateSep10Token(anchor.homeDomain, publicKey)
  const { jwt: freshJwt } = await authenticate(anchor, publicKey)
  return fetch(url, withAuth(freshJwt))
}

// ─── POST /quote — firm quote ────────────────────────────────────────────────────

function toRequestBody(params: Sep38FirmQuoteRequest): Record<string, string> {
  const body: Record<string, string> = {
    sell_asset: params.sellAsset,
    buy_asset: params.buyAsset,
  }
  if (params.sellAmount !== undefined) body['sell_amount'] = params.sellAmount
  if (params.buyAmount !== undefined) body['buy_amount'] = params.buyAmount
  if (params.context !== undefined) body['context'] = params.context
  if (params.sellDeliveryMethod !== undefined) body['sell_delivery_method'] = params.sellDeliveryMethod
  if (params.buyDeliveryMethod !== undefined) body['buy_delivery_method'] = params.buyDeliveryMethod
  if (params.countryCode !== undefined) body['country_code'] = params.countryCode
  if (params.expireAfter !== undefined) body['expire_after'] = params.expireAfter
  return body
}

function parseFirmQuote(data: Record<string, unknown>): Sep38FirmQuote {
  const id = data['id']
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('SEP-38 quote response is missing a string "id" field')
  }

  const expiresAtRaw = data['expires_at']
  if (typeof expiresAtRaw !== 'string') {
    throw new Error('SEP-38 quote response is missing a string "expires_at" field')
  }
  const expiresAt = new Date(expiresAtRaw)
  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error(`SEP-38 quote "expires_at" is not a valid date: "${expiresAtRaw}"`)
  }

  const fee = data['fee']
  return {
    id,
    expiresAt,
    price: String(data['price'] ?? ''),
    totalPrice: String(data['total_price'] ?? ''),
    sellAsset: String(data['sell_asset'] ?? ''),
    sellAmount: String(data['sell_amount'] ?? ''),
    buyAsset: String(data['buy_asset'] ?? ''),
    buyAmount: String(data['buy_amount'] ?? ''),
    ...(fee !== undefined && fee !== null && typeof fee === 'object'
      ? { fee: fee as Sep38Fee }
      : {}),
  }
}

/**
 * Requests a firm quote from the anchor's SEP-38 quote server.
 *
 * Requires the anchor's SEP-10 JWT; the token is fetched from (or refreshed
 * into) the shared JWT cache and automatically renewed once on a 401.
 */
export async function requestFirmQuote(
  anchor: ResolvedAnchor,
  publicKey: string,
  params: Sep38FirmQuoteRequest
): Promise<Sep38FirmQuote> {
  const quoteServer = getQuoteServer(anchor)
  const url = `${quoteServer}/quote`
  const body = JSON.stringify(toRequestBody(params))

  const res = await authenticatedRequest(anchor, publicKey, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (!res.ok) {
    throw parseSepErrorBody(await readErrorBody(res), res.status)
  }

  const data = (await res.json()) as Record<string, unknown>
  return parseFirmQuote(data)
}

// ─── DELETE /quote/:id ────────────────────────────────────────────────────────────

/**
 * Deletes a previously issued firm quote (DELETE /quote/:id).
 *
 * Requires the anchor's SEP-10 JWT and, like {@link requestFirmQuote},
 * auto-refreshes the token once on a 401.
 */
export async function deleteFirmQuote(
  anchor: ResolvedAnchor,
  publicKey: string,
  quoteId: string
): Promise<void> {
  const quoteServer = getQuoteServer(anchor)
  const url = `${quoteServer}/quote/${encodeURIComponent(quoteId)}`

  const res = await authenticatedRequest(anchor, publicKey, url, { method: 'DELETE' })

  if (!res.ok) {
    throw parseSepErrorBody(await readErrorBody(res), res.status)
  }
}
