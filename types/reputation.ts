// ─── Outcome log schema (Issue #127 / #218) ───────────────────────────────────
//
// The append-only outcome row written after every terminal intent. This is the
// source-of-truth log the rolling scorecard and the delivered-rate reconciler
// (#130) read from — distinct from the derived aggregate row in `aggregate.ts`.

export const OUTCOME_STATUSES = ['completed', 'partial', 'refunded', 'expired', 'error'] as const;
export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];

export interface OutcomeLogRow {
  /** SHA-256 of the canonical intent — the row's primary key. */
  intentHash: string;
  anchorId: string;
  corridor: string;
  /** Quoted exchange rate (decimal string) at intent time. */
  quotedRate: string;
  /** Actual delivered rate, backfilled by the reconciler; null until settled. */
  deliveredRate: string | null;
  quotedAmount: string;
  /** Actual delivered amount, backfilled by the reconciler; null until settled. */
  deliveredAmount: string | null;
  /** Wall-clock seconds from submission to terminal state; null when unknown. */
  settleSeconds: number | null;
  outcome: OutcomeStatus;
  /** RFC 3339 timestamp when the row was created. */
  createdAt: string;
  /** Stellar tx hash used by the reconciler to look up the on-chain payment. */
  stellarTransactionId: string | null;
  /** RFC 3339 timestamp when the reconciler backfilled delivery; null until then. */
  reconciledAt: string | null;
  /** Set to true when an admin marks this outcome as disputed (#164). */
  disputed: boolean;
  /** Human-readable reason supplied by the admin when disputing; null when not disputed. */
  disputedReason: string | null;
  /** RFC 3339 timestamp when the publisher mirrored this outcome to the Soroban oracle; null until published. */
  publishedAt: string | null;
  /** Tx hash of the `submit_outcome` call that published this row on-chain; null until published. */
  oracleTxHash: string | null;
}

// ─── Uptime / quote-latency probe ledger (Issue #D002 / #D005) ────────────────
//
// Probe samples recorded into the health ledger. An `uptime` row captures one
// SEP-1 stellar.toml reachability check for an anchor; a `quote` row captures
// one SEP-38 quote round-trip for an anchor+corridor, timed independently of
// uptime so a slow-but-reachable anchor is distinguishable from a down one.
// Both kinds carry a classified failure type so the dashboard can distinguish
// DNS/TLS issues from plain HTTP errors or timeouts.

export const PROBE_FAILURE_TYPES = ['dns', 'tls', 'http', 'timeout', 'unknown'] as const;
export type ProbeFailureType = (typeof PROBE_FAILURE_TYPES)[number];

export const PROBE_KINDS = ['uptime', 'quote'] as const;
export type ProbeKind = (typeof PROBE_KINDS)[number];

export interface ProbeLedgerRow {
  /** Anchor home domain that was probed. */
  domain: string;
  /** Which check this row represents: stellar.toml reachability, or a SEP-38 quote round-trip. */
  kind: ProbeKind;
  /** Corridor ID (e.g. 'usdc-ngn') for `quote` rows; null for `uptime` rows. */
  corridor: string | null;
  /** True when the probe succeeded (toml resolved, or a quote was returned). */
  reachable: boolean;
  /** Round-trip time in milliseconds (0 when unreachable). */
  latencyMs: number;
  /** Classified failure reason; null when reachable. */
  failureType: ProbeFailureType | null;
  /** Raw error message; null when reachable. */
  error: string | null;
  /** ISO 8601 timestamp of the probe. */
  probedAt: string;
}

/** p50/p95 latency over a rolling window of an anchor+corridor's reachable quote samples. */
export interface LatencyPercentiles {
  p50Ms: number;
  p95Ms: number;
  /** Number of reachable samples the percentiles were computed over. */
  sampleCount: number;
}
