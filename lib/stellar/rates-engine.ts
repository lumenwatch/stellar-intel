import { AnchorRate, RateComparison } from '@/types'
import { getAnchorsByCorridorId, getCorridorById } from './anchors'
import { fetchAnchorFee, AnchorRateError } from './sep24'
import { computeTotalReceived } from '@/lib/utils'

export interface RatesEngineOptions {
  onQuoteArrived?: (quote: AnchorRate) => void;
  timeoutMs?: number;
}

export async function fetchRates(
  corridorId: string,
  amount: string,
  options?: RatesEngineOptions
): Promise<RateComparison> {
  const anchors = getAnchorsByCorridorId(corridorId)
  const corridor = getCorridorById(corridorId)
  const timeoutMs = options?.timeoutMs ?? 1500; // 1.5s MVP timeout
  
  const pending: { anchorId: string; anchorName: string }[] = []
  const quotes: AnchorRate[] = []
  
  const promises = anchors.map(async (anchor) => {
    pending.push({ anchorId: anchor.id, anchorName: anchor.name })
    
    const fetchPromise = (async () => {
      const { fee, exchangeRate } = await fetchAnchorFee({
        anchorDomain: anchor.homeDomain,
        operation: 'withdraw',
        assetCode: anchor.assetCode,
        assetIssuer: anchor.assetIssuer,
        amount,
        type: 'bank_account',
      })

      const feeNum = Number(fee)
      const amountNum = Number(amount)

      if (exchangeRate <= 0) {
        throw new AnchorRateError(
          anchor.id,
          `${anchor.name} returned a zero or missing exchange rate for ${corridor.to} — rate cannot be derived`
        )
      }

      const totalReceived = computeTotalReceived(amountNum, feeNum, 0, exchangeRate)

      const rate: AnchorRate = {
        anchorId: anchor.id,
        anchorName: anchor.name,
        corridorId,
        fee: feeNum,
        feeType: 'flat',
        exchangeRate,
        totalReceived: totalReceived > 0 ? totalReceived : 0,
        source: 'sep24-fee',
        updatedAt: new Date(),
      }
      
      return rate
    })();
    
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, timeoutMs)
    });
    
    try {
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (result) {
        // Arrived before timeout
        const pIdx = pending.findIndex(p => p.anchorId === anchor.id);
        if (pIdx > -1) pending.splice(pIdx, 1);
        quotes.push(result);
      } else {
        // Timeout reached, wait in background
        fetchPromise.then((r) => {
          options?.onQuoteArrived?.(r);
        }).catch((err) => {
          // Ignore background errors
        });
      }
    } catch (err) {
      // Error fetching before timeout
      const pIdx = pending.findIndex(p => p.anchorId === anchor.id);
      if (pIdx > -1) pending.splice(pIdx, 1);
    }
  });

  await Promise.allSettled(promises);

  let bestRateId = '';
  if (quotes.length > 0) {
    const best = quotes.reduce((a, b) => ((b.totalReceived ?? 0) > (a.totalReceived ?? 0) ? b : a));
    bestRateId = best.anchorId;
  }

  return {
    corridorId,
    rates: quotes,
    pending,
    bestRateId
  }
}
