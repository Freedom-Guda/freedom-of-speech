# Freedom of Speech

> **One human, one account. No platform bans. Bot-free reviews. Permanent comments.**

A browser extension and embed protocol that layers a decentralized comment / review system on top of any URL on the internet. Identity is bound to a device biometric (WebAuthn). Humanity is proven via a Semaphore zero-knowledge proof. Comment metadata is anchored on Base (Ethereum L2). Content lives on IPFS. Mute and block are *client-side only* — there is no protocol-level censorship primitive, by design.

This is an early-stage research codebase. It builds, it tests, it has a working end-to-end Hardhat demo. It has not been deployed to mainnet. The Semaphore verifier is currently mocked. See [ARCHITECTURE.md](ARCHITECTURE.md) and the *What's working / what's not* section below before forming an opinion.

## Status

| Layer | State |
|---|---|
| Solidity contracts (`FreedomOfSpeech`, `SocialGraph`) | ✅ tested, end-to-end demo passes |
| Identity (WebAuthn → DID:key, secp256k1 signer, EIP-712) | ✅ tested |
| Browser extension (WXT + React + Tailwind, shadow-DOM overlay) | ✅ builds, real WebAuthn flow wired |
| Drop-in SDK (zero-dep, ~5 KB) | ✅ tested |
| The Graph subgraph | ✅ schema + AssemblyScript mappings; needs deployed addresses |
| Real Semaphore verifier on-chain | ⏳ mocked |
| Relayer service | ⏳ not built |
| Mainnet deploy | ⏳ not deployed |

## Why this exists

Every centralized comment platform is one ToS update away from deletion. Every social network can ban anyone for any reason or no reason. Every "verified" badge is a paywall. Every review is contaminated by undisclosed bots.

The protocol fixes this at the layer where it's actually fixable — the data layer.

- **No platform bans.** The protocol has no admin role. There is no "delete this comment" function anywhere. Full stop.
- **Mute and block are yours.** Personal block lists live on your device. Optionally publish them on-chain so they travel between your devices and clients.
- **One human, one account.** WebAuthn binds a credential to a hardware enclave. Semaphore proves group membership without doxxing the credential. Sybil attacks become physically bounded.
- **Content is permanent.** IPFS for content, Arweave for archive, Base for the commitment ledger. No host can vanish.
- **Open protocol.** Anyone can build a client. The chain is the source of truth.

## Try it locally

```bash
git clone https://github.com/Freedom-Guda/freedom-of-speech.git
cd freedom-of-speech
pnpm install

# End-to-end smart contract demo (Hardhat in-memory)
pnpm --filter @fos/contracts demo:inline

# All tests
pnpm test

# SDK demo page
pnpm --filter @fos/web dev   # → http://localhost:4173

# Browser extension (WXT — needs `wxt prepare` first)
pnpm --filter @fos/extension wxt:prepare
pnpm --filter @fos/extension build
# then load packages/extension/.output/chrome-mv3 in chrome://extensions
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full developer setup, including the known DNS-restricted local-environment caveat for `wxt prepare`.

## Project layout

```
freedom-of-speech/
├── packages/
│   ├── extension/    Chrome / Firefox / Safari extension (WXT + React)
│   ├── sdk/          Drop-in embed for sites — zero runtime deps
│   ├── contracts/    Solidity (Base, Ethereum L2)
│   ├── identity/     WebAuthn, DID:key, secp256k1 signer, Shamir SSS, Semaphore facade
│   ├── protocol/     Shared comment + URL canonicalization helpers
│   ├── indexer/      The Graph subgraph
│   └── ui/           Shared React utilities
├── apps/
│   ├── web/          Static landing + SDK demo
│   └── docs/         (placeholder)
└── infra/
    ├── docker/
    └── terraform/
```

## Tech choices

| Layer | What | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Cache-aware, fast |
| Extension | WXT + React 18 + Tailwind | Cross-browser MV3, shadow-DOM isolation |
| Contracts | Solidity 0.8.24 + Hardhat | Cancun EVM, OpenZeppelin 5 |
| Chain | Base | Cheap, EVM, decent decentralization story |
| Identity | WebAuthn + DID:key + secp256k1 | Hardware-bound, EVM-compatible |
| ZK | Semaphore | Purpose-built for "prove humanity, reveal nothing" |
| Indexer | The Graph | Decentralized GraphQL over contract events |
| SDK | tsup → IIFE + ESM | Zero-dep, drop-in `<script>` tag |
| Storage | IPFS + Arweave | Content-addressed, permanent |

## Non-negotiable invariants

These design rules are not preferences — they are the project. PRs that violate them will be closed:

1. **No platform-level ban / delete / hide primitive.** Anywhere.
2. **Mute and block remain client-side.** On-chain anchoring is opt-in personal storage, not enforcement.
3. **One human, one account** via WebAuthn + Semaphore. No phone/email gates, ever.
4. **Content is permanent.** IPFS + Arweave. No retention windows, no cleanup jobs.
5. **Open protocol.** Anyone can build a client; nothing privileges the reference clients.

## Open questions

These need answers before mainnet:

- Pinning service for IPFS — Pinata vs web3.storage vs self-hosted nodes?
- Relayer model — single canonical relayer, or a discoverable list?
- Real Semaphore circuit and trusted-setup ceremony.
- URL canonicalization edge cases (query-string-routed sites).
- Block list publishing economics — gas cost for an anchor vs UX.
- DAO treasury vs fully ungoverned protocol.

## License

MIT. See [LICENSE](LICENSE).

## Status disclaimer

Comments posted to the deployed mainnet (whenever that ships) are permanent. There is no delete primitive. Don't post anything you wouldn't want to live forever.
