'use client';

import Link from 'next/link';
import { ArrowRight, Trophy, TrendingUp, Zap } from 'lucide-react';
import { useAnchorRates } from '@/hooks/useAnchorRates';
import { formatCurrency, formatRate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

const DEFAULT_CORRIDOR_ID = 'usdc-ngn';
const DEFAULT_AMOUNT = '100';

export function Hero() {
  const { rates, isLoading } = useAnchorRates(DEFAULT_CORRIDOR_ID, DEFAULT_AMOUNT);
  const bestRate =
    rates?.rates.find((rate) => rate.anchorId === rates.bestRateId) ?? rates?.rates[0] ?? null;
  const leaderboardPreview =
    rates?.rates.filter((rate) => rate.source !== 'unavailable').slice(0, 3) ?? [];
  const loading = isLoading && !rates;

  return (
    <section className="py-12 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        <Zap className="h-3.5 w-3.5" />
        Stellar Execution Layer
      </div>
      <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-white md:text-5xl">
        Where stablecoin transactions
        <br />
        <span className="text-blue-600">happen on Stellar.</span>
      </h1>
      <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
        Stellar Intel is the execution layer for cross-border stablecoin flows — execute USDC
        off-ramps across anchors for Nigeria, Kenya, Ghana, Mexico, and more in one click.
      </p>

      <div className="mx-auto mt-10 grid max-w-5xl gap-4 text-left lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {loading ? <RatePreviewSkeleton /> : <RatePreviewCard bestRate={bestRate} />}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {loading ? (
            <LeaderboardTeaserSkeleton />
          ) : (
            <LeaderboardTeaser entries={leaderboardPreview} />
          )}
        </div>
      </div>
    </section>
  );
}

function RatePreviewCard({
  bestRate,
}: {
  bestRate: {
    anchorName: string;
    exchangeRate: number | null;
    totalReceived: number | null;
  } | null;
}) {
  return (
    <div className="flex min-h-[184px] flex-col justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <TrendingUp className="h-3.5 w-3.5" />
          Live rate preview
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Previewing the best live quote for 100 USDC → NGN.
        </p>

        {bestRate ? (
          <>
            <div className="mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">
              Best live quote
            </div>
            <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {bestRate.totalReceived !== null
                ? formatCurrency(bestRate.totalReceived, 'NGN')
                : 'Quote unavailable'}
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {bestRate.anchorName}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {bestRate.exchangeRate !== null
                ? formatRate(bestRate.exchangeRate, 'USDC', 'NGN')
                : 'Live rate temporarily unavailable'}
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-xl border border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Live rates are temporarily unavailable.
          </div>
        )}
      </div>

      <Link
        href="/offramp"
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        Compare all live rates
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function LeaderboardTeaser({
  entries,
}: {
  entries: Array<{
    anchorId: string;
    anchorName: string;
    totalReceived: number | null;
  }>;
}) {
  return (
    <div className="flex min-h-[184px] flex-col justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <Trophy className="h-3.5 w-3.5" />
          Leaderboard teaser
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Top anchors in the default USDC/NGN corridor right now.
        </p>

        {entries.length > 0 ? (
          <div className="mt-5 space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.anchorId}
                className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    #{index + 1} {entry.anchorName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Current landed value
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {entry.totalReceived !== null ? formatCurrency(entry.totalReceived, 'NGN') : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Leaderboard data is temporarily unavailable.
          </div>
        )}
      </div>

      <Link
        href="/anchors?corridor=usdc-ngn"
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        View corridor leaderboard
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function RatePreviewSkeleton() {
  return (
    <div className="flex min-h-[184px] flex-col justify-between">
      <div>
        <Skeleton className="mb-3 h-6 w-32 rounded-full" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-5 h-4 w-24" />
        <Skeleton className="mt-2 h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
      <Skeleton className="mt-6 h-4 w-36" />
    </div>
  );
}

function LeaderboardTeaserSkeleton() {
  return (
    <div className="flex min-h-[184px] flex-col justify-between">
      <div>
        <Skeleton className="mb-3 h-6 w-36 rounded-full" />
        <Skeleton className="h-4 w-56" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Skeleton className="mt-6 h-4 w-40" />
    </div>
  );
}
