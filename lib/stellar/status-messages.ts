import type { WithdrawStatusValue } from '@/types';

/**
 * Human-readable explanation for a terminal *failure* status, distinguishing
 * an anchor-side error from a refund from an expiry — each implies a
 * different next step for the user. Returns null for non-terminal or
 * successful (`completed`) statuses.
 */
export function terminalErrorMessage(
  status: WithdrawStatusValue,
  transactionId: string
): string | null {
  switch (status) {
    case 'error':
      return `The anchor reported an error. Your USDC was not settled. Contact anchor support with transaction ID ${transactionId}.`;
    case 'refunded':
      return 'The anchor refunded your USDC. Check your Stellar wallet.';
    case 'expired':
      return 'The transaction expired before settlement. Your USDC was not sent.';
    default:
      return null;
  }
}
