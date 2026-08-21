/**
 * Standings presentation rules for /anchors/standings.
 *
 * These lived inline in the page component, which is an async server component
 * and therefore not reachable from vitest. The empty-sample rule is a
 * correctness rule rather than a styling one — an anchor with no recorded
 * outcomes must not be labelled "poor" and must not hold first place — so it
 * belongs somewhere it can be asserted. See tests/standings-ranking.spec.ts.
 */

/** The two fields the ranking and labelling rules actually read. */
export interface RankableStanding {
  composite: number;
  sampleSize: number;
}

/**
 * An anchor is measured once it has at least one recorded outcome. Everything
 * below turns on this: a zero-sample anchor has not performed badly, it has not
 * performed at all, and a score computed from nothing ranks on priors.
 */
export function isMeasured(sampleSize: number): boolean {
  return sampleSize > 0;
}

/**
 * Verdict text and colour token for a composite score.
 *
 * A zero-sample anchor gets its own label rather than falling through to
 * "poor", which is what a 0 composite would otherwise produce.
 */
export function scoreLabel(
  score: number,
  sampleSize: number
): { label: string; className: string } {
  if (!isMeasured(sampleSize)) return { label: 'not yet measured', className: 'text-fg-muted' };
  if (score >= 0.8) return { label: 'excellent', className: 'text-status-up' };
  if (score >= 0.6) return { label: 'good', className: 'text-secondary-text' };
  if (score >= 0.4) return { label: 'fair', className: 'text-status-unknown' };
  return { label: 'poor', className: 'text-status-down' };
}

/**
 * Sort descending by composite and assign a 1-based rank.
 *
 * Ranks are assigned across every row, measured or not, so the ordinals stay
 * contiguous with the rendered table. Whether a given row is allowed to *show*
 * its rank is `holdsTopRank` and `isMeasured`, not this function.
 *
 * `Array.prototype.sort` is stable, so equal composites keep registry order.
 */
export function rankStandings<T extends RankableStanding>(entries: T[]): (T & { rank: number })[] {
  return [...entries]
    .sort((a, b) => b.composite - a.composite)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

/**
 * Only a measured anchor can hold first place. A gold badge on a zero-sample
 * row is an award for having been sorted first out of a list of equal zeroes.
 */
export function holdsTopRank(entry: { rank: number; sampleSize: number }): boolean {
  return entry.rank === 1 && isMeasured(entry.sampleSize);
}
