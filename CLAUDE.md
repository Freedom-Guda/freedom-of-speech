# Freedom of Speech — Claude Code Project Guide

> One account per human. No platform bans. Bot-free reviews. Censorship-resistant.

---

## What this project is

A browser extension + blockchain protocol that layers a decentralized comment/review system on top of any webpage on the internet. Users get one permanent account tied to biometric proof-of-humanity. Comments live on IPFS and are anchored on-chain — no company can delete them. Sites can embed natively via SDK. Mute/block is client-side only — no censorship at the protocol level.

---

## Monorepo structure

```
freedom-of-speech/
├── packages/
│   ├── extension/          # Browser extension (Chrome/Firefox/Safari)
│   ├── sdk/                # JS embed SDK for sites integrating natively
│   ├── contracts/          # Solidity smart contracts (Ethereum L2)
│   ├── identity/           # BioAuth + DID + ZK proof library
│   ├── protocol/           # Core comment protocol (shared logic)
│   ├── indexer/            # Relay indexer for fast queries
│   └── ui/                 # Shared React component library
├── apps/
│   ├── web/                # Marketing site + account dashboard
│   └── docs/               # Developer documentation
├── infra/
│   ├── docker/
│   └── terraform/
├── CLAUDE.md               # This file
├── package.json            # Workspace root (pnpm workspaces)
└── turbo.json              # Turborepo config
```

---

## Tech stack decisions

| Layer | Technology | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Fast, cache-aware builds across packages |
| Extension | WXT (Web Extension Tools) + React | Cross-browser manifest v3, HMR in dev |
| UI | React 18 + Tailwind + shadcn/ui | Rapid, accessible components |
| Contracts | Solidity + Hardhat | EVM-compatible, best tooling |
| Chain | Base (Ethereum L2) | Low fees, Coinbase trust, EVM |
| Identity | WebAuthn + Passkeys + ZK | Hardware enclave = true biometric, ZK = privacy |
| DID | W3C DID:key + Ceramic Network | Self-sovereign identity, cross-chain |
| Storage | IPFS (content) + Arweave (archive) | Content-addressed, permanent |
| Indexer | The Graph protocol | Decentralized GraphQL over contract events |
| SDK | Vanilla TS bundle | Zero dependencies, any framework |
| Backend relay | Hono on Cloudflare Workers | Edge, fast, cheap |
| Database (relay) | Cloudflare D1 | SQLite at the edge for read cache |

---

## Phase 1 — Foundation (start here)

See the original guide for the seven prompts in order:

1. Scaffold the monorepo structure (this is done).
2. Create the WXT browser extension with React content script + shadow DOM overlay.
3. Build the identity package with WebAuthn, DID:key, Shamir secret sharing.
4. Write FreedomOfSpeech.sol + SocialGraph.sol with Hardhat scaffolding.
5. Build the CommentOverlay React component (FloatingButton, ThreadPanel, CommentCard, ComposeBox, AuthPrompt, ModerationControls).
6. Create Hardhat deploy scripts (Base Sepolia) + The Graph subgraph schema.
7. Build the vanilla TS embed SDK with zero dependencies.

---

## Non-negotiable design principles

- **No platform bans** — the protocol has no ban mechanism. Full stop.
- **Mute/block is always client-side** — content stays on chain, filtered locally.
- **One human, one account** — enforced by WebAuthn + ZK proof, not by rules.
- **Content is permanent** — IPFS + Arweave means nothing disappears.
- **No phone numbers, no email** — WebAuthn biometric only for account creation.
- **Open protocol** — anyone can build a client, the chain is the source of truth.

---

## Identity (most critical)

ZK proof pipeline:

```
User Device                    ZK Relayer                    Chain
    │                              │                           │
    │──WebAuthn assertion────────▶│                           │
    │                              │──generate ZK proof──────▶│
    │                              │  (prove: "I own DID X    │
    │                              │   and passed biometric   │
    │                              │   without revealing key")│
    │◀─proof + DID────────────────│                           │
    │                              │                           │
    │──postComment(cid, sig)──────────────────────────────────▶
```

Use **Semaphore** (Ethereum Privacy Scaling Exploration) — purpose-built for "prove group membership without revealing who you are." Semaphore group = verified humans. Semaphore signal = comment posting.

```bash
pnpm add @semaphore-protocol/identity @semaphore-protocol/group @semaphore-protocol/proof
```

Cross-device recovery via Shamir Secret Sharing — split private key into N shares, require M to reconstruct. Lost-all-devices fallback: 2-of-3 trusted-contact social recovery.

---

## Open questions to resolve early

1. **Which L2 for mainnet?** Base (recommended) vs Optimism vs Polygon.
2. **IPFS pinning service?** Pinata (start) vs web3.storage vs own nodes.
3. **ZK proof system?** Semaphore (start) vs custom Noir circuit.
4. **Biometric provider?** WebAuthn native (start) vs WorldCoin.
5. **Revenue model?** Protocol fee per post (DAO treasury) + site analytics subscription.

---

## Development workflow

```bash
pnpm install
pnpm dev             # extension + UI hot reload
pnpm test
pnpm build

# Deploy contracts
cd packages/contracts && npx hardhat deploy --network baseSepolia

# Load extension
# Chrome → Extensions → Developer mode → Load unpacked → packages/extension/.output/chrome-mv3
```

---

## Environment variables

See `.env.example`. Never commit `.env.local`.

---

## Testing strategy

| Package      | Tests                                                |
|--------------|------------------------------------------------------|
| identity     | unit tests for WebAuthn mock + DID derivation        |
| contracts    | Hardhat tests (fork Base mainnet for integration)    |
| protocol     | unit tests for URL canonicalization + IPFS round-trips |
| extension    | Playwright + Chrome extension testing                |
| sdk          | Cypress component tests                              |
