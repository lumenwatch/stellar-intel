import type { AnchorRate } from '@/types';
import { formatCurrency, formatRate } from '@/lib/utils';

const FEE_TYPE_LABELS: Record<AnchorRate['feeType'], string> = {
  flat: 'Flat fee',
  percent: 'Percentage fee',
  combined: 'Flat + percentage fee',
};

const SOURCE_LABELS: Record<AnchorRate['source'], string> = {
  sep38: 'Firm quote (SEP-38)',
  'sep24-fee': 'Indicative (SEP-24)',
  'sep6-info': 'Indicative (SEP-6 /info)',
  'sep6-fee': 'Indicative (SEP-6 /fee)',
  unavailable: 'Unavailable',
};

const QUOTE_STATUS_LABELS: Record<NonNullable<AnchorRate['quoteStatus']>, string> = {
  firm: 'Firm',
  expiring: 'Expiring soon',
  refreshing: 'Refreshing',
};

interface RateRowDetailProps {
  rate: AnchorRate;
  currency: string;
  colSpan: number;
}

export function RateRowDetail({ rate, currency, colSpan }: RateRowDetailProps) {
  return (
    <tr className="border-t border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30">
      <td colSpan={colSpan} className="px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Fee</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {rate.fee !== null ? formatCurrency(rate.fee, 'USD') : '—'} (
              {FEE_TYPE_LABELS[rate.feeType]})
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Rate</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {rate.exchangeRate !== null && rate.exchangeRate > 0
                ? formatRate(rate.exchangeRate, 'USDC', currency)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">You receive</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {rate.totalReceived !== null ? formatCurrency(rate.totalReceived, currency) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Quote type</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {SOURCE_LABELS[rate.source]}
            </dd>
          </div>
          {rate.quoteStatus && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Quote status</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {QUOTE_STATUS_LABELS[rate.quoteStatus]}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Last updated</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {rate.updatedAt.toLocaleTimeString()}
            </dd>
          </div>
        </dl>
      </td>
    </tr>
  );
}
