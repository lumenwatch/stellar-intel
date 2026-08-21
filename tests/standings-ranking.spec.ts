/**
 * The empty-sample rule on /anchors/standings.
 *
 * With no recorded outcomes every anchor scores 0, the list sorts, and whichever
 * row lands first used to be awarded a "#1" badge. That is a ranking computed
 * from nothing. These assert the rule that replaced it.
 */

import { describe, expect, it } from 'vitest';
import { holdsTopRank, isMeasured, rankStandings, scoreLabel } from '@/lib/reputation/standings';

const anchor = (composite: number, sampleSize: number) => ({ composite, sampleSize });

describe('isMeasured', () => {
  it('treats a zero sample as unmeasured', () => {
    expect(isMeasured(0)).toBe(false);
  });

  it('treats a single recorded outcome as measured', () => {
    expect(isMeasured(1)).toBe(true);
  });
});

describe('scoreLabel', () => {
  it('labels a zero-sample anchor as not yet measured, not poor', () => {
    expect(scoreLabel(0, 0)).toEqual({ label: 'not yet measured', className: 'text-fg-muted' });
  });

  it('still labels a measured anchor scoring zero as poor', () => {
    // The distinction the page exists to draw: 0 from evidence is a verdict,
    // 0 from no evidence is not.
    expect(scoreLabel(0, 12).label).toBe('poor');
  });

  it('maps the score bands', () => {
    expect(scoreLabel(0.9, 5).label).toBe('excellent');
    expect(scoreLabel(0.7, 5).label).toBe('good');
    expect(scoreLabel(0.5, 5).label).toBe('fair');
    expect(scoreLabel(0.2, 5).label).toBe('poor');
  });

  it('puts the band boundaries on the inclusive side', () => {
    expect(scoreLabel(0.8, 5).label).toBe('excellent');
    expect(scoreLabel(0.6, 5).label).toBe('good');
    expect(scoreLabel(0.4, 5).label).toBe('fair');
  });
});

describe('rankStandings', () => {
  it('orders by composite descending', () => {
    const ranked = rankStandings([anchor(0.2, 4), anchor(0.9, 4), anchor(0.5, 4)]);
    expect(ranked.map((entry) => entry.composite)).toEqual([0.9, 0.5, 0.2]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });

  it('does not mutate the array it is given', () => {
    const input = [anchor(0.2, 4), anchor(0.9, 4)];
    rankStandings(input);
    expect(input.map((entry) => entry.composite)).toEqual([0.2, 0.9]);
  });

  it('keeps registry order for equal composites', () => {
    const ranked = rankStandings([anchor(0, 0), anchor(0, 0), anchor(0, 0)]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });
});

describe('holdsTopRank', () => {
  it('awards no first place when nothing has been measured', () => {
    const ranked = rankStandings([anchor(0, 0), anchor(0, 0), anchor(0, 0)]);
    expect(ranked.some(holdsTopRank)).toBe(false);
  });

  it('awards first place to a measured anchor', () => {
    const ranked = rankStandings([anchor(0, 0), anchor(0.75, 30), anchor(0, 0)]);
    const top = ranked.filter(holdsTopRank);
    expect(top).toHaveLength(1);
    expect(top[0]?.composite).toBe(0.75);
  });

  it('does not let a zero-sample anchor outrank a measured one', () => {
    const [first] = rankStandings([anchor(0, 0), anchor(0.1, 3)]);
    if (!first) throw new Error('expected a ranked entry');
    expect(first.sampleSize).toBe(3);
    expect(holdsTopRank(first)).toBe(true);
  });

  it('leaves first place empty when the best measured anchor ties a zero sample at 0', () => {
    // Known gap, documented rather than silently fixed: weightedComposite is
    // clamped to [0, 1], so a fully failing measured anchor scores exactly 0 and
    // ties every unmeasured row. The sort is stable, so registry order decides,
    // and rank 1 can land on an unmeasured anchor. Nobody then shows "#1".
    const ranked = rankStandings([anchor(0, 0), anchor(0, 8)]);
    expect(ranked[0]?.sampleSize).toBe(0);
    expect(ranked.some(holdsTopRank)).toBe(false);
  });
});
