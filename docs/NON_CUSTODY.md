# Non-Custody Manifesto

> Stellar Intel never holds user keys, never holds user funds, and never
> touches fiat. This is not a policy we promise to keep — it is a property of
> how the system is built. This document states the guarantee, names the
> mechanism that enforces it, and lists what would have to break for it to be
> false.

> **Status: 🛠️ Planned (stub).** This is the canonical home for the
> non-custody guarantee referenced from the README, the PR template, the grant
> [PROPOSAL.md](PROPOSAL.md), and [ARCHITECTURE.md § 9](ARCHITECTURE.md#9-trust-boundaries--invariants).
> The invariants below are authoritative for the shipped off-ramp; the
> reputation/publisher paths they reference land with v2.

---

## The guarantee

1. **We never hold user keys.** Signing happens in Freighter (web) or the
   caller's own wallet (agent). No key material is transmitted to, stored by,
   or reconstructable from anything Stellar Intel runs.
2. **We never hold user funds.** The withdrawal payment flows directly from
   the user's Stellar account to the anchor's receiving address. No Stellar
   Intel account ever sits between them.
3. **We never touch fiat.** Fiat settlement is strictly between the anchor and
   the user's bank or mobile-money provider. Stellar Intel operates no banking
   rail and has no fiat float.

## How it is enforced

- **Custody is the anchor's, under SEP-24.** Once the user submits the
  on-ledger payment, the anchor takes custody and is contractually the party
  that delivers fiat. The protocol, not our goodwill, defines this boundary.
- **Atomicity is Stellar's.** The payment either confirms on the public ledger
  or it does not. There is no intermediate state in which Stellar Intel holds
  value.
- **The one key we hold cannot move funds.** The publisher key (v2) signs
  reputation writes to the Soroban oracle and nothing else. It has no
  authority over any account holding user value. See
  [ARCHITECTURE.md § 6](ARCHITECTURE.md#6-reputation-write-path-v2).

## What would have to break

This guarantee fails only if one of the following is violated — each is an
invariant a PR is not allowed to break:

- A code path transmits or persists a user private key. (None exists; SEP-10
  signing is delegated to the wallet.)
- A payment is routed through a Stellar Intel–controlled account instead of
  directly to the anchor.
- The publisher key is granted authority over a value-bearing account.

Adversarial analysis of these failure modes lives in
[THREAT_MODEL.md](THREAT_MODEL.md). The regulatory consequence of holding the
line — why non-custody keeps us out of money-transmitter classification — is in
[JURISDICTIONAL.md](JURISDICTIONAL.md).

---

_See also: [SECURITY.md](SECURITY.md) for key handling and disclosure policy._
