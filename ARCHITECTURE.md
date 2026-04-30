# Architecture

## High-level

```
┌──────────────┐       ┌────────────────┐
│  Browser     │       │  Site SDK      │
│  Extension   │       │  (drop-in)     │
└──────┬───────┘       └────────┬───────┘
       │ EIP-712 signed payloads
       │                        │
       ▼                        ▼
┌────────────────────────────────────────┐
│  Relayer (planned)                     │
│  - rate limit, gas pay, ZK verify      │
│  - rejects DIDs not in Semaphore set   │
└──────────────────┬─────────────────────┘
                   │ tx
                   ▼
┌────────────────────────────────────────┐
│  Base L2                               │
│  - FreedomOfSpeech.sol                 │
│  - SocialGraph.sol                     │
│  - SemaphoreVerifier (planned)         │
└──────────────────┬─────────────────────┘
                   │ events
                   ▼
┌────────────────────────────────────────┐
│  The Graph subgraph                    │
│  Thread / Comment / VerifiedHuman /    │
│  Block entities                        │
└──────────────────┬─────────────────────┘
                   │ GraphQL
                   ▼
       ┌─────────────────────┐
       │ Edge cache          │
       │ (Cloudflare Worker) │
       └─────────────────────┘
                   │
                   ▼
              Clients

Content payloads (CommentContent JSON) live on IPFS.
Long-term archive: Arweave snapshot of IPFS pins.
```

## Identity

Two keys, one human:

1. **WebAuthn credential** — proves "I'm a human and this is my device." Used to derive a Semaphore identity for ZK proof of group membership.
2. **secp256k1 signer** — Ethereum-compatible. Signs the EIP-712 `Comment(urlHash, cid, parentId, nonce)` payload. The contract maps `did → signerAddress` once at registration.

V1 stores the signer key in `chrome.storage.local`. V2 will bind it to a WebAuthn PRF-derived secret so it can't be exfiltrated by any other extension or page-level XSS.

## Why two keys?

WebAuthn signatures are P-256 / Ed25519, not secp256k1. We could verify P-256 on-chain via a precompile or a circuit, but it's expensive and wouldn't compose with existing Ethereum tooling. Cheaper: WebAuthn proves humanity (off-chain via Semaphore), and a fresh Ethereum key signs comments.

## Why Semaphore

The protocol's invariant — "one human, one account" — must be enforceable without doxxing the user. Semaphore is purpose-built for "prove group membership, reveal nothing else." Group = registered humans. Signal = comment commitment. Scope = action domain (registration, posting, reporting…).

Verification is on-chain via the auto-generated Semaphore verifier contract. The current build uses `MockHumanVerifier` so tests don't need the trusted setup yet.

## URL canonicalization

Identical pages must hash to the same `urlHash` so threads merge across visitors. Today's normalization:

- Strip URL fragment.
- Lowercase hostname.
- Remove trailing slash from non-root paths.
- Drop common tracking parameters (`utm_*`, `gclid`, `fbclid`, `mc_cid`, `mc_eid`, `ref`, `ref_src`).

Open question: should we strip query strings entirely on news / blog / video sites? That would merge `?id=123` variants but break sites that route via query string.

## Mute, block, report

All client-side. The protocol has no `delete`, `ban`, or `hide` primitive. The `SocialGraph` contract exists only so a user's *own* personal block list can travel between their devices and clients. Nothing about it removes content.

Reports go to whatever aggregator a client subscribes to. Aggregators are competing services, not protocol-blessed authorities. A client is free to subscribe to none.

## Storage layers

| What | Where | Why |
|---|---|---|
| Comment text + metadata | IPFS | Content-addressed, large blobs |
| Comment commitment + author + parent | Base L2 | Cheap, ordered, programmable |
| Subscribed indexes (sort, count) | The Graph | GraphQL surface for clients |
| Hot reads | Cloudflare Worker | Edge cache to absorb traffic |
| Long-term archive | Arweave | Permanent backup of IPFS pins |

## Threat model — short version

- **Sybil attack**: deterred by WebAuthn+Semaphore. One credential per device, one Semaphore identity per credential. Collusion across many devices is bounded by physical access.
- **Censorship**: not possible at the protocol layer. Possible at the client layer (a client could refuse to render certain DIDs) — that's a feature, not a bug. Mute is yours.
- **Spam**: deterred by economic cost of proof-of-humanity registration + per-comment gas. Optional client-side filters take it from there.
- **Key theft**: V1 — full account compromise if attacker reads `chrome.storage.local`. V2 — WebAuthn PRF binding makes the on-disk material useless without the device biometric.
- **Relayer collusion**: relayers can refuse to broadcast specific comments. Mitigation: anyone can run a relayer; the SDK supports configuring a list of fallbacks.

## What's not built yet

- Real Semaphore circuit + on-chain verifier (currently `MockHumanVerifier`).
- The relayer service.
- Cross-device key sharing UX (the Shamir helpers exist; the UI doesn't).
- Indexer wiring against deployed contract addresses.
- Mainnet deploy.
