/**
 * app/anchors/standings/page.tsx
 *
 * Reputation standings view (#801) — lets anchors see their own ranking in the
 * leaderboard so the order-flow incentive is visible, not just an internal sort.
 *
 * Data is fetched server-side from the leaderboard API and rendered as a static
 * table. The page revalidates every 5 minutes to stay fresh without blocking
 * the user on each load.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ANCHORS } from '@/constants';
import { AnchorLogo } from '@/components/ui/AnchorLogo';
import { weightedComposite } from '@/lib/reputation/composite';

export const metadata: Metadata = {
  title: 'Anchor Standings — Stellar Intel',
  description:
    'Reputation standings for Stellar anchors. Rankings are based on fill rate, slippage, and settlement time.',
};

export const revalidate = 300; // 5 minutes

// ─── Types ────────────────────────────────────────────────────────────────────

interface StandingsEntry {
  rank: number;
  anchorId: string;
  anchorName: string;
  composite: number;
  fillRate: number;
  settleP50: number;
  slippageP50: number;
  sampleSize: number;
}

// ─── Score helpers ────────────────────────────────────────────────────────────

/**
 * Composite score formula — mirrors app/api/reputation/leaderboard/route.ts.
 *
 *   composite = 0.4 × fill_rate
 *             + 0.3 × (1 − slippage_p50 / 0.05)
 *             + 0.3 × (1 − settle_p50 / 300)
 */
function scoreLabel(score: number, sampleSize: number): { label: string; className: string } {
  // An anchor with no recorded outcomes has not scored badly — it has not been
  // measured. Calling that "Poor" is the empty-sample failure docs/POSITIONING.md
  // retires by name: a fill-rate penalty computed from nothing ranks on priors.
  if (sampleSize === 0) return { label: 'not yet measured', className: 'text-fg-muted' };
  if (score >= 0.8) return { label: 'excellent', className: 'text-status-up' };
  if (score >= 0.6) return { label: 'good', className: 'text-secondary-text' };
  if (score >= 0.4) return { label: 'fair', className: 'text-status-unknown' };
  return { label: 'poor', className: 'text-status-down' };
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadStandings(): Promise<StandingsEntry[]> {
  // Import server-only reputation modules dynamically to avoid bundling them
  // into the client. This page is a React Server Component.
  const { buildScorecards, mapOutcomeRows } = await import('@/lib/reputation/aggregate');
  const { getReputationStore } = await import('@/lib/reputation/store');

  const entries = await Promise.all(
    ANCHORS.map(async (anchor) => {
      try {
        // Resolved inside the try: a postgres backend with no SqlExecutor throws
        // here, and at prerender time there is none. Same guard as loadAnchorRows
        // in app/anchors/[id]/page.tsx.
        const rows = await getReputationStore().query({ anchorId: anchor.id });
        const scorecard = buildScorecards(mapOutcomeRows(rows))[30];

        if (scorecard.state !== 'ok') {
          return {
            anchorId: anchor.id,
            anchorName: anchor.name,
            composite: 0,
            fillRate: 0,
            settleP50: 0,
            slippageP50: 0,
            sampleSize: scorecard.sampleSize,
          };
        }

        const fillRate = scorecard.fillRate;
        const settleP50 = scorecard.settleMs.p50 / 1000;
        const slippageP50 = scorecard.slippage.p50;

        return {
          anchorId: anchor.id,
          anchorName: anchor.name,
          composite: weightedComposite(fillRate, settleP50, slippageP50),
          fillRate,
          settleP50,
          slippageP50,
          sampleSize: scorecard.sampleSize,
        };
      } catch {
        // Store unavailable in dev — show anchor with zero score rather than crash.
        return {
          anchorId: anchor.id,
          anchorName: anchor.name,
          composite: 0,
          fillRate: 0,
          settleP50: 0,
          slippageP50: 0,
          sampleSize: 0,
        };
      }
    })
  );

  // Sort descending by composite score and assign ranks.
  entries.sort((a, b) => b.composite - a.composite);
  return entries.map((entry, index) => ({ rank: index + 1, ...entry }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StandingsPage() {
  const standings = await loadStandings();
  const measured = standings.filter((entry) => entry.sampleSize > 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header>
        <h1 className="type-title">Anchor standings</h1>
        <p className="text-secondary-text measure mt-4 text-base">
          Reputation ranking across every registered anchor, over a 30-day rolling window, refreshed
          every five minutes. Top-ranked anchors receive order-flow priority in the routing engine.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-fg-muted font-mono text-xs tracking-wide">
            {measured.length} of {standings.length} measured
          </p>
          <Link
            href="/anchors"
            className="text-secondary-text hover:text-primary-text focus-visible:ring-accent focus-visible:ring-offset-background inline-flex h-11 items-center rounded-sm font-mono text-xs tracking-wide underline underline-offset-4 transition-colors duration-100 ease-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            &larr; all anchors
          </Link>
        </div>
      </header>

      {/* Method, stated inline rather than in a tinted callout box. A blue
          "info" panel introduces a hue to say "this is a note"; a bordered
          block says the same thing using the surface. */}
      <section className="border-border bg-bg-subtle mt-12 rounded-sm border p-5">
        <h2 className="text-fg-muted font-mono text-xs tracking-wide">how the ranking works</h2>
        <p className="text-secondary-text mt-3 text-sm">
          Composite score = 40% fill rate + 30% slippage against a 5% ceiling + 30% settlement speed
          against a 5-minute reference. Higher is better. An anchor with no confirmed transactions
          is listed as not yet measured rather than scored — it has not performed badly, it has not
          been observed.{' '}
          <Link
            href="/methodology"
            className="text-primary-text hover:text-accent underline underline-offset-4"
          >
            Full methodology &rarr;
          </Link>
        </p>
      </section>

      <div className="border-border mt-12 overflow-x-auto border-t">
        <table className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">Anchor reputation standings</caption>
          <thead>
            <tr className="text-fg-muted border-border border-b font-mono text-xs tracking-wide">
              <th scope="col" className="py-3 pr-4 text-left font-medium">
                rank
              </th>
              <th scope="col" className="py-3 pr-4 text-left font-medium">
                anchor
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">
                score
              </th>
              <th
                scope="col"
                className="py-3 pr-4 text-right font-medium"
                title="Fraction of transactions that reached completed status"
              >
                fill rate
              </th>
              <th
                scope="col"
                className="py-3 pr-4 text-right font-medium"
                title="Median settlement time in seconds"
              >
                settle p50
              </th>
              <th
                scope="col"
                className="py-3 pr-4 text-right font-medium"
                title="Median slippage between quoted and delivered rate"
              >
                slippage p50
              </th>
              <th
                scope="col"
                className="py-3 text-right font-medium"
                title="Number of transactions used to compute this score"
              >
                samples
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry) => {
              const { label, className } = scoreLabel(entry.composite, entry.sampleSize);
              const unmeasured = entry.sampleSize === 0;
              // Only an anchor with recorded outcomes can hold first place. A
              // gold badge on a zero-sample row is an award for having been
              // sorted first out of a list of equal zeroes.
              const isTop = entry.rank === 1 && !unmeasured;

              return (
                <tr
                  key={entry.anchorId}
                  className="border-border hover:bg-bg-subtle border-b transition-colors duration-100 ease-out"
                >
                  <td className="py-4 pr-4">
                    <span className="text-fg-muted font-mono text-xs tabular-nums">
                      {unmeasured ? '—' : String(entry.rank).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <Link
                      href={`/anchors/${entry.anchorId}`}
                      className="group focus-visible:ring-accent focus-visible:ring-offset-background inline-flex items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <AnchorLogo
                        anchorId={entry.anchorId}
                        anchorName={entry.anchorName}
                        size="sm"
                      />
                      <span className="font-medium group-hover:underline group-hover:underline-offset-4">
                        {entry.anchorName}
                      </span>
                      {isTop && (
                        /* The one accent on this page. */
                        <span className="text-accent font-mono text-xs">#1</span>
                      )}
                    </Link>
                  </td>
                  <td className="py-4 pr-4 text-right">
                    {unmeasured ? (
                      <span className="text-fg-muted font-mono text-xs">{label}</span>
                    ) : (
                      <>
                        <span className={`font-mono tabular-nums ${className}`}>
                          {(entry.composite * 100).toFixed(1)}%
                        </span>
                        <span className={`ml-2 font-mono text-xs ${className}`}>{label}</span>
                      </>
                    )}
                  </td>
                  <td className="text-secondary-text py-4 pr-4 text-right font-mono tabular-nums">
                    {entry.sampleSize > 0 ? `${(entry.fillRate * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="text-secondary-text py-4 pr-4 text-right font-mono tabular-nums">
                    {entry.sampleSize > 0 ? `${entry.settleP50.toFixed(0)}s` : '—'}
                  </td>
                  <td className="text-secondary-text py-4 pr-4 text-right font-mono tabular-nums">
                    {entry.sampleSize > 0 ? `${(entry.slippageP50 * 100).toFixed(2)}%` : '—'}
                  </td>
                  <td className="text-fg-muted py-4 text-right font-mono tabular-nums">
                    {entry.sampleSize}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-fg-muted measure mt-6 text-sm">
        Scores reflect only on-chain settled transactions recorded in the Stellar Intel reputation
        store. An anchor with zero samples is unranked rather than ranked last — absence of a record
        is not evidence of poor performance, and treating it as such is how a monitor turns into a
        rumour.
      </p>
    </main>
  );
}
