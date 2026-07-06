/**
 * Build-time feature flags.
 *
 * `NEXT_PUBLIC_INTENT_FLOW` gates the signed-intent off-ramp path. It is OFF by
 * default and only enabled when explicitly set to `'true'` — the semantics the
 * live consumer (`components/offramp/ExecuteDrawer.tsx`) depends on.
 */
export const FLAGS = {
  INTENT_FLOW: process.env.NEXT_PUBLIC_INTENT_FLOW === 'true',
};
