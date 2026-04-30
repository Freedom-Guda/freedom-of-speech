# Contributing

Thanks for reading. This is an early-stage project — feedback and PRs welcome.

## Ground rules

The project's design principles are non-negotiable:

- **No platform bans.** The protocol has no admin role. Don't propose one.
- **Mute and block are client-side only.** On-chain anchoring is opt-in.
- **One human, one account** via WebAuthn + Semaphore. No phone/email gates.
- **Content is permanent.** IPFS + Arweave. No delete primitive at any layer.

PRs that violate any of these will be closed.

## Setup

```bash
# Requirements: Node 20+, pnpm 10+
git clone https://github.com/Freedom-Guda/freedom-of-speech.git
cd freedom-of-speech
pnpm install
```

## Workspace layout

| Package | What |
|---|---|
| `packages/extension` | Browser extension (WXT + React + Tailwind) |
| `packages/sdk` | Drop-in embed for sites — zero runtime deps |
| `packages/contracts` | Solidity (Hardhat) |
| `packages/identity` | WebAuthn, DID:key, secp256k1 signer, Shamir SSS, Semaphore facade |
| `packages/protocol` | Shared comment + URL canonicalization helpers |
| `packages/indexer` | The Graph subgraph |
| `packages/ui` | Shared React utilities |
| `apps/web` | Static landing + SDK demo |
| `apps/docs` | (placeholder for developer docs) |

## Common tasks

```bash
pnpm test                                 # all unit tests
pnpm typecheck                            # all packages
pnpm build                                # production build of every package
pnpm --filter @fos/contracts demo:inline  # full E2E in Hardhat memory
pnpm --filter @fos/web dev                # static demo with live reload
```

The browser extension uses [WXT](https://wxt.dev). Generate type-stubs once:

```bash
pnpm --filter @fos/extension wxt:prepare
pnpm --filter @fos/extension build       # outputs .output/chrome-mv3
```

Then load `packages/extension/.output/chrome-mv3` in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

## Smart contract changes

Run the inline demo to sanity-check end-to-end behavior:

```bash
pnpm --filter @fos/contracts demo:inline
```

For local on-disk runs:

```bash
pnpm --filter @fos/contracts node          # terminal 1
pnpm --filter @fos/contracts demo:local    # terminal 2
```

For Sepolia, copy `.env.example` → `.env.local`, fill in `DEPLOYER_PRIVATE_KEY` and a free Sepolia RPC, then `pnpm --filter @fos/contracts deploy:sepolia`.

## Tests

- TypeScript packages use Vitest (`pnpm --filter <pkg> test`).
- Solidity uses Hardhat + Chai (`pnpm --filter @fos/contracts test`).
- Browser extension tests are stubbed; Playwright suites are welcome.
- Subgraph tests require the matchstick binary — not run in default CI yet.

Aim for **80%+ coverage** on any new TypeScript module that contains real logic.

## Code style

- TypeScript strict mode, no `any` outside narrow type-cast bridges.
- Prefer composition over inheritance.
- Files <800 lines; functions <50 lines.
- No mutation: spread, return new objects.
- No `console.log` in committed code.

Run `pnpm prettier --write .` before committing.

## Commits & PRs

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`
- One concept per PR.
- Update relevant tests in the same PR.
- Mention any breaking change in the PR body.

## Known local-environment gotcha

If you're on a sandboxed/restricted-DNS network, WXT's offline check may fail and `wxt prepare`/`wxt build` will throw `fetch failed` or `unknown scheme`. CI on Linux runners isn't affected. If you hit this locally, switch off the network restriction for the build step or run only the contracts/identity/sdk packages.

## Security

Found a vulnerability? Don't open a public issue. Open a private security advisory on GitHub instead.
