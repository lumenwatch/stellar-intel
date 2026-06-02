import useSWR, { useSWRConfig } from "swr";
import type { RateComparison, AnchorRate } from "@/types";
import { useState, useCallback } from "react";
import { fetchRates } from "@/lib/stellar/rates-engine";

export interface UseAnchorRatesResult {
  rates: RateComparison | undefined;
  isLoading: boolean;
  error: string | undefined;
  mutate: () => Promise<void>;
  refreshInflight: boolean;
}

export function useAnchorRates(
  corridorId: string,
  amount: string
): UseAnchorRatesResult {
  const [refreshInflight, setRefreshInflight] = useState(false);
  const { mutate: globalMutate } = useSWRConfig();

  const key = corridorId && amount ? ["rates", corridorId, amount] : null;

  const { data, error, isLoading, mutate } = useSWR<
    RateComparison,
    Error
  >(
    key,
    async ([, cid, amt]) => {
      return fetchRates(cid, amt, {
        onQuoteArrived: (quote: AnchorRate) => {
          globalMutate(
            key,
            (current: RateComparison | undefined) => {
              if (!current) return current;
              const newPending = current.pending.filter((p) => p.anchorId !== quote.anchorId);
              // Avoid duplicates
              if (current.rates.some((r) => r.anchorId === quote.anchorId)) {
                return current;
              }
              const newRates = [...current.rates, quote];
              const best = newRates.reduce((a, b) =>
                (b.totalReceived ?? 0) > (a.totalReceived ?? 0) ? b : a
              );
              return {
                ...current,
                pending: newPending,
                rates: newRates,
                bestRateId: best.anchorId,
              };
            },
            { revalidate: false }
          );
        },
      });
    },
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    }

    wasDocumentVisible.current = isDocumentVisible;
  }, [hasRateQuery, isDocumentVisible, mutate]);

  // ─── Auto-refresh watcher (near-expiry) ──────────────────────────────────────
  //
  // Polls every EXPIRY_POLL_INTERVAL_MS. When ANY rate row has less than
  // REFRESH_THRESHOLD_MS of its QUOTE_VALIDITY_MS window remaining, a refresh is
  // triggered for the whole corridor. A ref flag prevents concurrent or
  // back-to-back refresh spam: once a refresh is in-flight the watcher skips
  // until the data updates. The watcher only runs while the document is visible
  // so it honours the tab-hidden pause behaviour.
  const dataRef = useRef<RateComparison | undefined>(data);
  dataRef.current = data;

  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!hasRateQuery || !isDocumentVisible) return;

    const intervalId = setInterval(() => {
      const current = dataRef.current;
      if (!current || refreshingRef.current) return;

      const now = Date.now();
      const anyNearExpiry = current.rates.some((rate) => {
        if (!rate.updatedAt) return false;
        const age = now - new Date(rate.updatedAt).getTime();
        const remaining = QUOTE_VALIDITY_MS - age;
        return remaining < REFRESH_THRESHOLD_MS;
      });

      if (anyNearExpiry) {
        refreshingRef.current = true;

        mutate()
          .catch(() => {
            // Silently swallow refresh errors — the existing stale data remains
            // displayed and the next poll cycle will retry.
          })
          .finally(() => {
            refreshingRef.current = false;
          });
      }
    }, EXPIRY_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [hasRateQuery, isDocumentVisible, mutate]);

  const annotatedRates = useMemo<RateComparison | undefined>(() => {
    if (!data) return undefined;
    const now = Date.now();
    return {
      ...data,
      rates: data.rates.map((rate) => {
        if (rate.source !== 'sep38' || !rate.updatedAt) return rate;
        const age = now - new Date(rate.updatedAt).getTime();
        const remaining = QUOTE_VALIDITY_MS - age;
        const quoteStatus: AnchorRate['quoteStatus'] =
          refreshingRef.current ? 'refreshing'
          : remaining < REFRESH_THRESHOLD_MS ? 'expiring'
          : 'firm';
        return { ...rate, quoteStatus };
      }),
    };
  // refreshInflight is state (triggers re-render) and serves as proxy for refreshingRef changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, refreshInflight]);

  const refresh = useCallback(async () => {
    if (refreshInflight) return;

    setRefreshInflight(true);

    try {
      // clear stale UI immediately
      await mutate(undefined, { revalidate: false });

      // fetch fresh data
      await mutate();
    } finally {
      setRefreshInflight(false);
    }
  }, [mutate, refreshInflight]);

  return {
    rates: annotatedRates,
    isLoading,
    error: error?.message,
    mutate: refresh,
    refreshInflight,
  };
}
