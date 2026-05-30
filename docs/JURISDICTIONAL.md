# Jurisdictional Memo — Money Transmission

> Why Stellar Intel is not a money transmitter, money services business (MSB),
> or virtual-asset service provider (VASP). This memo records the reasoning a
> grant reviewer, a partner anchor, or counsel reads to understand the
> regulatory posture. It is an engineering-and-product memo, **not legal
> advice**.

> **Status: 🛠️ Planned (stub).** This is the canonical home for the
> jurisdictional argument referenced from the grant [PROPOSAL.md](PROPOSAL.md)
> and [ARCHITECTURE.md](ARCHITECTURE.md). The classification argument below
> follows directly from the non-custody guarantee; a full counsel-reviewed
> memo lands as the product approaches mainnet reputation writes (v2).

---

## The classification question

Money-transmitter / MSB / VASP regimes (FinCEN in the US, and analogous
frameworks elsewhere) generally attach to a party that **accepts and transmits
value on behalf of another** — i.e. one that takes custody of funds, even
momentarily, in the course of moving them.

Stellar Intel does none of this. The position rests entirely on the
[non-custody guarantee](NON_CUSTODY.md):

- **No acceptance of funds.** The user's payment goes directly to the anchor's
  Stellar address. Stellar Intel never receives the value being moved.
- **No transmission on behalf of another.** We surface quotes and help
  construct a transaction the user signs themselves. The transmitting parties
  are the user (on-ledger) and the anchor (fiat-side), each already operating
  under their own licences.
- **No fiat float, no settlement account.** There is no bank account, no
  pooled balance, and no point at which user value rests under our control.

We are, functionally, an **information and transaction-construction service** —
closer to a price-comparison site plus a transaction builder than to a
remitter.

## Where the licensed parties sit

| Party             | Role                                  | Regulatory standing                                   |
| ----------------- | ------------------------------------- | ----------------------------------------------------- |
| **User**          | Signs and submits their own payment   | Acting for themselves; not transmitting for another.  |
| **Anchor**        | Takes custody (SEP-24), delivers fiat | Licensed where it operates (its compliance, its KYC). |
| **Stellar Intel** | Quotes, ranks, builds the transaction | Non-custodial; no value handling.                     |

KYC/AML obligations attach at the **anchor**, which owns the KYC surface
(SEP-24 interactive flow) and the fiat off-ramp. Stellar Intel neither
collects nor stores KYC data.

## Open items for counsel review

- Per-jurisdiction confirmation that transaction-construction without custody
  does not trigger registration.
- Treatment of the reputation oracle (v2) as published data vs. a regulated
  activity (expected: published data — it moves no value).
- Disclosures/ToS language making the non-custodial, anchor-licensed model
  explicit to end users.

---

_This memo is informational and does not constitute legal advice. See
[NON_CUSTODY.md](NON_CUSTODY.md) for the technical guarantee it relies on, and
the risk register in [PROPOSAL.md](PROPOSAL.md)._
