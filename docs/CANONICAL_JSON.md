# Canonical JSON — Intent Hashing

> The deterministic encoding every party commits to. The user signs a hash
> over the canonical form of their intent; the anchor honours a quote against
> it; the publisher writes outcomes keyed by it. If two implementations
> disagree on the bytes, every signature downstream is worthless — so the
> encoding is specified, not assumed.

> **Status: 🛠️ Planned (wave 1.2) — not yet implemented.** `lib/intent/canonical.ts`
> and `lib/intent/hash.ts` do not exist on `main` today. This document is the
> spec the v1.2 router wave implements; the rules below are normative for that
> implementation, not a description of shipped code. See
> [ROADMAP.md](ROADMAP.md) and [ARCHITECTURE.md § 3](ARCHITECTURE.md#3-the-intent-lifecycle).

---

## Why canonicalize

JSON is not byte-stable: key order, whitespace, number formatting, and string
escaping all vary between serializers. A signature is over bytes, so two
"equal" JSON objects that serialize differently produce different hashes and
different signatures. Canonicalization removes that ambiguity: one object, one
byte string, one hash, forever.

## Rules

The canonical form of an intent is produced by these rules, applied in order:

1. **UTF-8, no BOM.** The output is a UTF-8 byte string with no byte-order mark.
2. **Object keys sorted.** Every object's keys are sorted lexicographically by
   Unicode code point, recursively, at every level.
3. **No insignificant whitespace.** No spaces, tabs, or newlines between
   tokens. `{"a":1,"b":2}`, never `{ "a": 1, "b": 2 }`.
4. **Strings minimally escaped.** Only the escapes JSON requires (`"`, `\`,
   and control characters `U+0000`–`U+001F`) are emitted, each in its shortest
   form. No `\uXXXX` for characters that can be represented literally.
5. **Integers normalized.** Decimal amounts are carried as **strings**
   (`sellAmount`, `minReceive`, …) and are not reinterpreted as numbers; any
   genuine JSON numbers are emitted without leading zeros, without a trailing
   `.0`, and without an exponent.
6. **No `null`-valued keys.** Optional fields that are absent are omitted
   entirely rather than serialized as `null`.

## Hash

```
intentHash = SHA-256( canonicalJSON(intent) )
```

The hash is lower-case hex of the 32-byte digest. The signature is Ed25519
over the **raw 32 digest bytes** (not the hex string), produced by the user's
Stellar key via Freighter.

## Test vectors

> 🛠️ Canonical test vectors (input intent → expected canonical bytes →
> expected hash) ship with `lib/intent/canonical.ts` in wave 1.2 and become
> the cross-implementation conformance suite for the SDK and any third-party
> signer.

---

_See also: [INTENT_API.md](INTENT_API.md) for the intent schema and signing
flow, [ARCHITECTURE.md](ARCHITECTURE.md) for where the hash is used across the
intent lifecycle._
