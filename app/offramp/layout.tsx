import type { Metadata } from 'next';

const TITLE = 'USDC off-ramp rates — Stellar Intel';
const DESCRIPTION =
  'Compare live USDC withdrawal rates across Stellar anchors and execute directly with a non-custodial wallet.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function OfframpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
