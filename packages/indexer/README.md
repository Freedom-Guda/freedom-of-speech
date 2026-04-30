# @fos/indexer

The Graph subgraph for the Freedom of Speech protocol on Base.

## What it indexes

Two contracts (see `../contracts/`):

- `FreedomOfSpeech` — `HumanVerified`, `CommentPosted`
- `SocialGraph` — `Blocked`, `Unblocked`

…producing four entity types in `schema.graphql`:

- `VerifiedHuman` (one per DID)
- `Thread` (one per `urlHash`)
- `Comment` (one per `commentId`)
- `Block` (one per `blocker:blockedDid` pair)

## Wiring it after deploy

After `pnpm --filter @fos/contracts deploy:sepolia`:

1. Read `../contracts/deployments/baseSepolia.json` for the addresses + start blocks.
2. Update `subgraph.yaml`:
   - `dataSources[0].source.address` → `FreedomOfSpeech` address
   - `dataSources[0].source.startBlock` → block of that deploy
   - `dataSources[1].source.address` → `SocialGraph` address
   - `dataSources[1].source.startBlock` → block of that deploy
3. `pnpm codegen && pnpm build`
4. `pnpm deploy:studio` — assumes you've authed `graph-cli` against your Subgraph Studio account.

## Local sanity check

```bash
pnpm codegen   # generates typed bindings from ABIs + schema
pnpm build     # compiles AssemblyScript mappings to wasm
```

## Relay cache

A Cloudflare Worker (Hono) sits in front of the public Graph endpoint to cache
hot threads (`urlHash`) at the edge. That worker lives in `relay/` and ships
separately — see its README.
