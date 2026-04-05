# StellarMesh Deep Dive

## Verdict

`StellarMesh` is a strong hackathon idea because it matches the published demand signals almost exactly:

- Agent marketplaces / service discovery
- Bazaar-style discoverability for x402 services
- Rating, reputation, and trust systems
- Agent wallets, coordination, and commerce

The strongest version is not "build everything." The strongest version is:

1. Build the missing discovery layer
2. Prove autonomous paid service hiring end-to-end
3. Use MPP session channels as the differentiator for repeat calls
4. Keep the on-chain surface area minimal and credible

## What The Resources Confirm

### x402 on Stellar is real and ready enough

Official Stellar docs show x402 is already wired for Stellar with Node/Express packages and a managed facilitator flow:

- `paymentMiddlewareFromConfig(...)` for paywalled endpoints
- `HTTPFacilitatorClient` for verification/settlement
- `@x402/stellar` exact scheme for Stellar
- Public facilitator usage in the quickstart

Source:

- https://developers.stellar.org/docs/build/agentic-payments/x402/quickstart-guide
- https://developers.stellar.org/docs/build/agentic-payments

Important implementation detail from the quickstart:

- Server responds with `402 Payment Required`
- Client creates a signed payment payload
- Facilitator verifies and settles on Stellar
- Server returns the protected response

That means your marketplace can absolutely sell agent services with live testnet USDC in a believable demo.

### MPP on Stellar is real, but still experimental

The official Stellar docs and the `stellar-mpp-sdk` repo confirm two usable modes:

- `charge`: one-time on-chain SAC transfer per request
- `channel` / session: one-way payment channel with off-chain cumulative commitments

Sources:

- https://developers.stellar.org/docs/build/agentic-payments
- https://developers.stellar.org/docs/build/agentic-payments/mpp/charge-guide
- https://developers.stellar.org/docs/build/agentic-payments/mpp/channel-guide
- https://github.com/stellar-experimental/stellar-mpp-sdk

The session guide is especially important for your pitch. It explicitly describes:

- One-time on-chain channel setup
- Off-chain voucher payments for repeated requests
- Server-side `close()` settlement using the highest cumulative commitment

That makes your hybrid router idea legitimate, not speculative.

### The MCP path is already proven

The `x402-mcp-stellar` repo already exposes a working stdio MCP server that can:

- show wallet info
- inspect facilitator support
- fetch and pay for x402-protected resources

Source:

- https://github.com/jamesbachini/x402-mcp-stellar

This is the fastest starting point for your `discover_service`, `hire_service`, and `check_reputation` tools.

### Agent wallet onboarding is a huge advantage

The `stellar-sponsored-agent-account` project is one of the best ecosystem shortcuts in your entire resource list.

It gives an agent a USDC-ready Stellar account in two API calls:

- `POST /create`
- `POST /submit`

And it already includes an agent-facing skill file plus OpenAPI output.

Source:

- https://github.com/oceans404/stellar-sponsored-agent-account

This is a big demo unlock because judges do not want to watch wallet setup friction.

### OpenZeppelin is useful, but use it selectively

OpenZeppelin's Stellar page confirms the relevant pieces:

- Contracts Wizard
- Contracts MCP
- Relayer
- audited Stellar contract libraries

Source:

- https://www.openzeppelin.com/networks/stellar

Use OZ to accelerate contract scaffolding and security review, but do not over-expand the contract surface just because the tooling exists.

## The Most Important Architecture Correction

### Do not make the reputation contract "read on-chain transaction history"

This is the biggest flaw in the original plan.

I did not find any official pattern showing Soroban contracts can inspect arbitrary historical transaction history to compute reputation directly on-chain. Based on the Soroban model and the docs/examples reviewed, treat that as unavailable for hackathon purposes.

So instead:

- x402 settlements and MPP closes happen off-chain / through API-visible flows
- your indexer or backend observes successful payments
- backend computes reputation
- backend writes signed score updates or periodic score snapshots on-chain

Best hackathon-friendly version:

1. Registry contract on-chain
2. Reputation events emitted by backend-orchestrated contract writes
3. Full reputation detail stored/indexed off-chain
4. Dashboard shows both on-chain score snapshot and off-chain evidence

This is still credible, still demoable, and much more buildable.

## Recommended Scope To Maximize Winning Odds

### Keep on-chain minimal

Build only one Soroban contract first:

- `ServiceRegistry`

Store:

- service id
- owner address
- name
- endpoint URL
- base price
- payment mode support
- capability tags
- active/inactive flag
- optional stake amount

If time remains, add a second small contract:

- `ReputationLedger`

Store only:

- service id
- aggregate score
- successful settlements count
- last updated ledger / timestamp marker

Do not start with a complex staking, slashing, or tx-history-reading design.

### Put the novelty in the router and orchestration

The real differentiator is:

- agent discovers paid service
- agent selects service based on capability + price + trust
- router pays with x402 first
- router upgrades to MPP session channel for repeated usage
- result is returned through MCP

That is the "wow" loop.

### Build only 2-3 demo services

Enough for a convincing network:

- Web search
- Weather/data feed
- AI inference

Three is enough. Four is optional polish.

## Best Technical Design

### Monorepo layout

```text
stellarmesh/
  apps/
    api/                 # discovery + registry + orchestration + indexer jobs
    dashboard/           # React/Vite or Next.js
    mcp-server/          # stdio MCP server for discovery/hiring/reputation
    demo-search-service/
    demo-weather-service/
    demo-inference-service/
  contracts/
    service-registry/
    reputation-ledger/   # optional second phase
  packages/
    shared/
    payment-router/
    stellar/
    types/
```

### API responsibilities

`apps/api` should own:

- service registration
- contract sync
- search/filter/rank
- settlement observation
- reputation recomputation
- MPP channel lifecycle metadata
- orchestration logs for the dashboard

### Payment router policy

Recommended v1 heuristic:

- first request to a service: x402
- requests 2-3 in same task/session: still x402
- request 4+: open or reuse MPP channel if service supports it
- close channel on inactivity timeout or session end

Why:

- easy to explain
- easy to instrument
- easy to show savings visually in the dashboard

## Reuse Map From The Repos

### Reuse directly

From `x402-stellar`:

- simple paywall server structure
- facilitator setup pattern
- Heroku/Docker deployment pieces

From `x402-mcp-stellar`:

- stdio MCP bootstrap
- Stellar signer wiring
- paid fetch flow

From `stellar-mpp-sdk`:

- `charge-server.ts`
- `channel-server.ts`
- `channel-open.ts`
- `channel-close.ts`

From `stellar-sponsored-agent-account`:

- two-call wallet bootstrap flow
- agent skill pattern
- OpenAPI-driven integration

### Use as references, not foundations

- `stellar-dev-skill`
- `openzeppelin-skills`
- `mcp-stellar-xdr`

These speed you up, but they are support tooling, not your product core.

## What To Build First

### Phase 1

- clone the x402 and MPP examples into your own monorepo structure
- get one paid x402 service working end-to-end on testnet
- get sponsored agent account flow working

### Phase 2

- build `ServiceRegistry` contract
- build REST API that mirrors on-chain state plus searchable indexes
- add service registration + search

### Phase 3

- build MCP server tools:
  - `discover_service`
  - `hire_service`
  - `check_reputation`

### Phase 4

- add MPP session upgrade path for repeated calls
- visualize x402 vs MPP in dashboard

### Phase 5

- polish demo, README, and video

## What Judges Will Actually Care About

The winning story is not "we used many protocols."

It is:

- There was no service discovery layer for paid agent services on Stellar
- We built the missing coordination layer
- Agents can now discover, evaluate, pay, and compose services autonomously
- We support both per-request settlement and session-based routing
- The demo uses real Stellar testnet transactions and real paid services

## Tooling Added For This Environment

Installed into local Codex skills:

- `stellar-dev`
- `setup-stellar-contracts`
- `develop-secure-contracts`
- `upgrade-stellar-contracts`

These now live under `C:\Users\singa\.codex\skills\`.

## Tools You Should Add Next

### 1. x402 Stellar MCP server

Use this when you want the agent to pay x402 endpoints directly:

- Repo: `refs/x402-mcp-stellar`

Suggested command:

```bash
npm --silent --prefix C:\Users\singa\Downloads\stellar-hacks\refs\x402-mcp-stellar run dev
```

### 2. Stellar XDR MCP server

Use this for decoding signed payment XDR, auth entries, and debugging failures:

- Repo: `refs/mcp-stellar-xdr`
- README shows a `deno`-based stdio config

### 3. OpenZeppelin Contracts MCP

Use this if you want AI-assisted contract generation/review around Stellar standards:

- https://mcp.openzeppelin.com/

## Final Build Recommendation

If you only have one shot, build this version:

- On-chain `ServiceRegistry`
- Off-chain indexed reputation engine with optional on-chain score snapshots
- Discovery/orchestration API
- MCP server for autonomous hiring
- 3 live paid services
- Hybrid x402 -> MPP router
- Dashboard proving live usage, reputation, and volume

That is the cleanest balance of:

- novelty
- demo power
- technical credibility
- finishability before April 13, 2026
