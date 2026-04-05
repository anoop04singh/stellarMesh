# StellarMesh

StellarMesh is an autonomous agent service network on Stellar testnet.

It gives agents a way to:

- discover paid services by capability, price, and reputation
- hire those services through one API
- pay through `x402` first and automatically upgrade to `MPP` for repeated calls
- access the network from MCP-compatible clients such as Claude or Codex
- inspect service activity in a dashboard
- anchor service registry and reputation snapshots on Soroban

## What is live today

The repository is wired to real Stellar testnet flows, not a mock payment layer.

Live pieces in this repo:

- `x402` facilitator for Stellar testnet
- payer wallet with testnet USDC flow
- real `x402` settlement for services
- real `MPP charge` settlement
- real `MPP channel` settlement
- Soroban `ServiceRegistry` contract
- Soroban `ReputationLedger` contract
- on-chain registered demo services

See [REAL_TESTNET_STATUS.md](C:\Users\singa\Downloads\stellar-hacks\REAL_TESTNET_STATUS.md) for the currently deployed contract IDs and runtime notes.

## Core features

### 1. Service discovery

Agents can search for services by:

- capability
- max price
- payment method
- reputation-backed ranking

### 2. Hybrid payment routing

The orchestration API starts with `x402` for low-frequency calls and switches to `MPP` when repeated calls make off-chain or semi-off-chain settlement cheaper.

Current live behavior:

- `Atlas Search` upgrades from `x402` to `MPP channel`
- `Sky Pulse` upgrades from `x402` to `MPP charge`
- `Mesh Inference` currently uses `x402`

### 3. Agent-native access

StellarMesh exposes an MCP server with tools for:

- `discover_service`
- `hire_service`
- `check_reputation`

This lets an agent discover, pay, and consume services without building custom client logic.

### 4. On-chain trust anchors

Soroban contracts hold:

- service registry data
- reputation snapshots and related scoring state

The API remains the orchestration layer, but contracts provide public network state and future composability.

## Repository structure

### Applications

- `apps/api`
  Discovery API, service registry API, orchestration API, reputation updates, metrics, activity feed.
- `apps/facilitator`
  Local `x402` facilitator for Stellar testnet.
- `apps/mcp-server`
  Stdio MCP server that wraps the API for agent clients.
- `apps/dashboard`
  Frontend UI for catalog, metrics, and live network feed.
- `apps/demo-search-service`
  Paid search service with `x402` and `MPP channel`.
- `apps/demo-weather-service`
  Paid weather service with `x402` and `MPP charge`.
- `apps/demo-inference-service`
  Paid inference/summarization service with `x402`.

### Packages

- `packages/shared`
  Shared types and utility models.
- `packages/payment-router`
  Hybrid payment routing logic and channel upgrade rules.

### Contracts

- `contracts/service-registry`
  Soroban registry contract for service metadata.
- `contracts/reputation-ledger`
  Soroban reputation contract for score snapshots.

### Data and scripts

- `data/dev-db.json`
  Local API-backed service, reputation, and activity database.
- `data/testnet-bootstrap.json`
  Generated testnet bootstrap data.
- `scripts/bootstrap-testnet.ts`
  Creates/funds accounts, trustlines, and local env data.
- `scripts/topup-search-channel.ps1`
  Adds more USDC to the search `MPP` channel.

## Architecture

```text
Agent / MCP Client
        |
        v
  apps/mcp-server
        |
        v
      apps/api
   discovery + hire
        |
        +--> x402 payer flow --> apps/facilitator --> Stellar testnet
        |
        +--> MPP payer flow  --> demo services      --> Stellar testnet
        |
        +--> reads / snapshots --> Soroban contracts
        |
        +--> dashboard metrics/activity
```

## Local setup

### Prerequisites

- Node.js 20+
- npm
- Rust + Cargo
- Stellar CLI
- a funded Stellar testnet payer wallet with testnet USDC

### Install

```powershell
cmd /c npm install
```

### Bootstrap testnet accounts

```powershell
cmd /c npm run bootstrap:testnet
```

This generates:

- `.env.testnet.local`
- `data/testnet-bootstrap.json`

### Build

```powershell
cmd /c npm run build
```

### Start the stack locally

In separate terminals:

```powershell
cmd /c npm run dev:facilitator
cmd /c npm run dev:search
cmd /c npm run dev:weather
cmd /c npm run dev:inference
cmd /c npm run dev:api
cmd /c npm run dev:dashboard
cmd /c npm run dev:mcp
```

Default ports:

- API: `4000`
- Facilitator: `4022`
- Search: `4101`
- Weather: `4102`
- Inference: `4103`
- Dashboard: Vite default

## Deployment guide

This repo is deployable today, but it is not yet packaged as a single-click monolith. The cleanest production-style deployment is to deploy the services separately.

### Recommended deployment topology

Deploy these as separate services:

1. `apps/facilitator`
2. `apps/api`
3. `apps/demo-search-service`
4. `apps/demo-weather-service`
5. `apps/demo-inference-service`
6. `apps/dashboard`

Keep `apps/mcp-server` out of public hosting. It is a stdio MCP process and should run close to the agent client, not as a public browser app.

### Recommended platforms

Good options:

- Railway
- Render
- Fly.io
- a small VPS with `pm2` or Docker Compose

If you want the fastest hackathon deploy, use Railway or Render for the HTTP services and Vercel or Netlify for the dashboard.

### Environment variables you need

At minimum, your deployed services need the values generated in `.env.testnet.local`, especially:

- `PAYER_SECRET`
- `PAYER_PUBLIC`
- `FACILITATOR_STELLAR_PRIVATE_KEY`
- `X402_FACILITATOR_URL`
- `STELLAR_RPC_URL`
- `MPP_SECRET_KEY`
- `COMMITMENT_SECRET_HEX`
- `COMMITMENT_PUBLIC_HEX`
- `SEARCH_PROVIDER_PUBLIC`
- `WEATHER_PROVIDER_PUBLIC`
- `INFERENCE_PROVIDER_PUBLIC`
- `SEARCH_CHANNEL_CONTRACT`
- `SERVICE_REGISTRY_CONTRACT_ID`
- `REPUTATION_LEDGER_CONTRACT_ID`

Frontend-specific:

- `VITE_STELLARMESH_API_URL`

MCP-specific:

- `STELLARMESH_API_URL`

### Deployment steps

#### Option A: deploy each service from the monorepo

For each service:

1. Create a new app on your hosting provider.
2. Point it at this repository.
3. Set the working directory to the repo root.
4. Set the build command to:

```powershell
cmd /c npm install && cmd /c npm run build
```

5. Set the start command per service:

API:

```powershell
node apps/api/dist/index.js
```

Facilitator:

```powershell
node apps/facilitator/dist/index.js
```

Search:

```powershell
node apps/demo-search-service/dist/index.js
```

Weather:

```powershell
node apps/demo-weather-service/dist/index.js
```

Inference:

```powershell
node apps/demo-inference-service/dist/index.js
```

Dashboard:

Use a static frontend deploy that runs:

```powershell
cmd /c npm run build -w @stellarmesh/dashboard
```

and publish:

```text
apps/dashboard/dist
```

#### Option B: self-host on one VM

1. Clone the repo on the server.
2. Copy `.env.testnet.local`.
3. Run `cmd /c npm install`.
4. Run `cmd /c npm run build`.
5. Start each HTTP process with `pm2`, Docker, NSSM, or system services.
6. Put Nginx or Caddy in front of them.
7. Route HTTPS subdomains such as:

- `api.yourdomain.com`
- `facilitator.yourdomain.com`
- `search.yourdomain.com`
- `weather.yourdomain.com`
- `infer.yourdomain.com`
- `app.yourdomain.com`

### Important deploy notes

- Update every service to use your deployed facilitator URL, not `http://localhost:4022`.
- Update the dashboard `VITE_STELLARMESH_API_URL` to your deployed API URL.
- Update the MCP server `STELLARMESH_API_URL` to your deployed API URL.
- The current API stores service/reputation/activity data in `data/dev-db.json`, so fully productionizing this means moving that state to a real shared database.
- The current MCP server is stdio, which is correct for agent tools. Do not expose it as a public browser endpoint unless you intentionally build an HTTP MCP wrapper.

## Contract explorer and source visibility

### Can the contracts be viewed on Stellar explorers?

Yes.

The current contract IDs can be opened in Stellar Lab's Contract Explorer:

- [Stellar Lab](https://developers.stellar.org/docs/tools/lab)
- [Contract Explorer](https://developers.stellar.org/es/docs/tools/lab/smart-contracts/contract-explorer)

In practice, paste the contract ID into Stellar Lab on `Testnet` and inspect:

- contract spec
- storage
- methods
- metadata
- client bindings
- version history

### Can the full source be made visible like Etherscan?

Not in the exact same way as Etherscan.

What Stellar supports well today is:

- linking source repository metadata into the built WASM
- surfacing metadata in tooling
- enabling build-verification style workflows around the contract artifact

The official Stellar CLI supports embedding metadata at build time:

- [Add meta data to contract WASM on build](https://developers.stellar.org/docs/tools/cli/cookbook/contract-build-meta)

Example:

```powershell
$SHA = git rev-parse HEAD

& 'C:\Program Files (x86)\Stellar CLI\stellar.exe' contract build `
  --manifest-path contracts/service-registry/Cargo.toml `
  --meta source_repo=https://github.com/your-org/stellarmesh `
  --meta commit_sha=$SHA
```

Do the same for `reputation-ledger`.

### Recommended contract visibility workflow

For the best explorer visibility:

1. Push the contract source code to a public GitHub repo.
2. Build the WASM with `source_repo` and `commit_sha` metadata.
3. Tag the release commit used for deployment.
4. Upload and deploy that exact WASM.
5. Publish the contract IDs in the README and hackathon submission.
6. If you add artifact attestation in CI, mention that in the submission as your build-verification story.

Honest caveat:

I found official documentation for metadata embedding and official Contract Explorer docs, but I did not find an official Stellar page describing a one-click "verified source code" flow identical to Etherscan. So the strongest source-visible path today is reproducible builds plus embedded source metadata.

## Soroban deployment workflow

If you need to redeploy contracts from scratch:

### Build

```powershell
$env:PATH = "$env:USERPROFILE\.cargo\bin;C:\Program Files (x86)\Stellar CLI;$env:PATH"

& 'C:\Program Files (x86)\Stellar CLI\stellar.exe' contract build `
  --manifest-path contracts/service-registry/Cargo.toml

& 'C:\Program Files (x86)\Stellar CLI\stellar.exe' contract build `
  --manifest-path contracts/reputation-ledger/Cargo.toml
```

### Deploy

```powershell
& 'C:\Program Files (x86)\Stellar CLI\stellar.exe' contract deploy `
  --wasm contracts\target\wasm32v1-none\release\service_registry.wasm `
  --source-account $env:REGISTRY_ADMIN_SECRET `
  --network-passphrase 'Test SDF Network ; September 2015' `
  --rpc-url 'https://soroban-testnet.stellar.org'
```

Repeat for `reputation-ledger`.

## Manual testing guide

Manual testing matters a lot for the demo. The fastest path is:

### 1. Health checks

```powershell
Invoke-RestMethod http://127.0.0.1:4022/health
Invoke-RestMethod http://127.0.0.1:4000/health
```

### 2. Discover services

```powershell
Invoke-RestMethod "http://127.0.0.1:4000/services?capability=web-search"
Invoke-RestMethod "http://127.0.0.1:4000/services?paymentMethod=mpp"
```

### 3. Inspect one service

```powershell
Invoke-RestMethod "http://127.0.0.1:4000/services/svc-search-brave"
```

### 4. Trigger a real paid hire

```powershell
$body = @{
  serviceId = 'svc-search-brave'
  sessionId = 'manual-demo'
  taskPayload = @{
    query = 'Stellar agent marketplaces'
  }
} | ConvertTo-Json -Depth 8

Invoke-RestMethod `
  -Method Post `
  -Uri 'http://127.0.0.1:4000/hire' `
  -ContentType 'application/json' `
  -Body $body
```

### 5. Verify hybrid routing

Call the same service repeatedly with the same `sessionId`.

Expected behavior:

- calls `1-3` return `method: "x402"`
- later calls switch to `method: "mpp"` for eligible services

### 6. Verify activity and metrics

```powershell
Invoke-RestMethod "http://127.0.0.1:4000/activity"
Invoke-RestMethod "http://127.0.0.1:4000/metrics"
```

### 7. Verify provider 402 challenge directly

This is useful when debugging settlement:

```powershell
@'
const response = await fetch('http://127.0.0.1:4101/x402/search', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: 'test' }),
});
console.log(response.status);
console.log(response.headers.get('payment-required'));
'@ | node --input-type=module -
```

### 8. Dashboard testing

Open the dashboard in a browser and verify:

- services render correctly
- metrics update
- feed updates after each hire

## API reference

### `GET /services`

Query parameters:

- `capability`
- `maxPrice`
- `paymentMethod`

### `POST /services/register`

Registers a service into the local API database and registry workflow.

### `GET /services/:id`

Returns service metadata and reputation snapshot.

### `POST /services/:id/rate`

Updates a service reputation snapshot.

### `POST /hire`

Request body:

```json
{
  "serviceId": "svc-search-brave",
  "sessionId": "session-123",
  "taskPayload": {
    "query": "Stellar smart contracts"
  }
}
```

Response includes:

- selected payment method
- routing reason
- settlement reference
- provider result

### `GET /activity`

Returns recent network activity.

### `GET /metrics`

Returns aggregate dashboard metrics.

## MCP and agent integration

### What the MCP server does

`apps/mcp-server` exposes the network to agent frameworks over stdio.

Tools:

- `discover_service`
- `hire_service`
- `check_reputation`

### How an agent accesses StellarMesh

There are two common patterns.

#### Pattern 1: agent talks to the HTTP API directly

Best when:

- you already have your own agent framework
- you want full control over orchestration
- you do not need MCP

In this pattern, the agent sends requests to:

- `GET /services`
- `POST /hire`
- `GET /services/:id`

#### Pattern 2: agent uses MCP

Best when:

- you want Claude, Codex, or another MCP-compatible client to use StellarMesh as a tool
- you want the network to feel native to the agent

### Running the MCP server

Local:

```powershell
cmd /c npm run dev:mcp
```

Production-style:

```powershell
node apps/mcp-server/dist/index.js
```

Set:

```text
STELLARMESH_API_URL=https://api.yourdomain.com
```

### Example MCP configuration

The exact config format depends on the MCP client, but the command shape is:

```json
{
  "mcpServers": {
    "stellarmesh": {
      "command": "node",
      "args": ["C:\\Users\\singa\\Downloads\\stellar-hacks\\apps\\mcp-server\\dist\\index.js"],
      "env": {
        "STELLARMESH_API_URL": "https://api.yourdomain.com"
      }
    }
  }
}
```

### How to add StellarMesh to an agent

1. Deploy the HTTP services.
2. Confirm the API base URL works.
3. Run the MCP server where the agent runs.
4. Point `STELLARMESH_API_URL` to the deployed API.
5. Add the MCP server command to your client configuration.
6. Test with:

- `discover_service`
- `check_reputation`
- `hire_service`

### Example agent prompts

- "Find me a web-search service under $0.03 and use it."
- "Check the reputation of `svc-weather-pulse`."
- "Hire the best inference service and summarize this document."

## How others can extend the network

### Add a new provider service

1. Create a new Express or HTTP service.
2. Protect one or more routes with `x402` or `MPP`.
3. Expose stable request/response JSON.
4. Register the service through `POST /services/register`.
5. Add capability tags and pricing.
6. If it is high-frequency, add an `MPP` path.

### Add a new capability family

Examples:

- scraping
- embeddings
- OCR
- financial data
- browser automation
- code execution

### Add a new payment strategy

Extend [index.ts](C:\Users\singa\Downloads\stellar-hacks\packages\payment-router\src\index.ts) to support:

- new thresholds
- service-specific routing rules
- session-aware upgrades
- future channel reuse policies

### Move to production-grade persistence

Current API data is file-backed. For a stronger production deployment, move:

- service catalog
- activity feed
- reputation snapshots
- router/session state

into a shared database such as PostgreSQL.

## Demo checklist

For the hackathon video:

1. Show the dashboard.
2. Show `GET /services`.
3. Call `/hire` once and show `x402`.
4. Call `/hire` repeatedly with the same `sessionId`.
5. Show the router switch to `MPP`.
6. Open Stellar Lab and show the contract IDs.
7. Show the MCP tools in an agent client.

## References

Primary docs and tools used:

- [Stellar Lab](https://developers.stellar.org/docs/tools/lab)
- [Contract Explorer](https://developers.stellar.org/es/docs/tools/lab/smart-contracts/contract-explorer)
- [Add meta data to contract WASM on build](https://developers.stellar.org/docs/tools/cli/cookbook/contract-build-meta)
- [Contract Lifecycle](https://developers.stellar.org/docs/build/guides/cli/contract-lifecycle)
- [x402 / Agentic Payments docs](https://developers.stellar.org/docs/build/agentic-payments)

## Current limitations

- API persistence is still file-backed
- MCP server is stdio-only, not an HTTP MCP gateway
- provider registration staking and anti-spam enforcement are not fully on-chain yet
- reputation is snapshot-backed and API-driven, not a fully trustless scoring oracle
- deploy process is documented, but not yet wrapped in one-click infra scripts

## Suggested next steps

- add Dockerfiles for each app
- add a real shared database
- add CI for contract builds and artifact attestation
- add hosted API docs and OpenAPI schema
- add auth/rate-limiting for public deployment
- add an HTTP MCP bridge for remote tool consumers
