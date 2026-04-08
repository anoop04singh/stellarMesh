# StellarMesh

StellarMesh is a discovery, onboarding, and access layer for paid agent services on Stellar.

It helps humans and autonomous agents:

- discover services by capability, price, payment method, and reputation
- inspect verified `x402` and `MPP` endpoints before using a provider
- retrieve direct-access instructions so agents can pay from their own wallets
- register new paid services through a verified onboarding flow
- use the network through HTTP or MCP

StellarMesh is not the wallet custodian and not the merchant of record. Agents pay providers directly from their own Stellar wallets. StellarMesh is the marketplace and discovery layer.

## Product boundary

What StellarMesh does:

- indexes and ranks services
- verifies service payment endpoints during registration
- exposes discovery and access APIs
- exposes MCP tools for agents
- maintains reputation snapshots and marketplace activity

What StellarMesh does not do:

- hold agent wallet keys
- pay providers on the agent's behalf
- proxy every paid call through a centralized buyer wallet

## What is in this repo

- `apps/api`
  Discovery API, registration API, access-guidance API, metrics, and activity feed.
- `apps/mcp-server`
  MCP wrapper around the marketplace API for agent clients.
- `apps/dashboard`
  Human-facing marketplace UI, agent instructions, and provider onboarding UI.
- `apps/demo-search-service`
  Example paid provider using `x402` and `MPP channel`.
- `apps/demo-weather-service`
  Example paid provider using `x402` and `MPP charge`.
- `apps/demo-inference-service`
  Example paid provider using `x402`.
- `apps/facilitator`
  Optional self-hosted facilitator for local development and testing.
- `contracts/service-registry`
  Soroban registry contract.
- `contracts/reputation-ledger`
  Soroban reputation contract.

The demo services exist to prove the network works. They are not the product. The product is the discovery layer that any provider can join.

## Default facilitator

For live provider payments, use the hosted Built on Stellar / OpenZeppelin x402 facilitator:

- Testnet facilitator URL: `https://channels.openzeppelin.com/x402/testnet`
- Testnet API key generation: [channels.openzeppelin.com/testnet/gen](https://channels.openzeppelin.com/testnet/gen)

The attached facilitator notes are implemented in the provider examples:

- provider services support `X402_FACILITATOR_URL`
- provider services support `X402_FACILITATOR_API_KEY`
- the default provider fallback now points to the hosted Stellar testnet facilitator

If you want to self-host instead, `apps/facilitator` remains available.

## Architecture

```text
Human / Agent
      |
      v
 apps/dashboard or apps/mcp-server
      |
      v
    apps/api
 discovery + access guidance + registration
      |
      +--> verified provider metadata
      +--> provider payment endpoints
      +--> Soroban snapshots
      +--> marketplace activity + reputation

Agent wallet-aware client
      |
      v
Provider x402 / MPP endpoint
      |
      v
Hosted or self-hosted Stellar facilitator
      |
      v
Stellar testnet
```

## Current API surface

### `GET /services`

Search the marketplace by:

- `capability`
- `maxPrice`
- `paymentMethod`

### `GET /services/:id`

Return full service metadata and reputation.

### `GET /services/:id/access`

Return direct-access instructions for a service.

This includes:

- supported payment methods
- provider endpoints
- a recommended payment path for `single` or `repeat` usage
- a reminder that the agent pays from its own wallet

Example:

```powershell
Invoke-RestMethod "https://stellarmeshapi.onrender.com/services/svc-search-brave/access"
Invoke-RestMethod "https://stellarmeshapi.onrender.com/services/svc-search-brave/access?usage=repeat"
```

### `POST /services/register`

Register a new provider service after StellarMesh verifies the declared payment endpoints.

### `POST /services/:id/rate`

Update reputation after external settlement or downstream scoring logic.

### `GET /activity`

Return recent marketplace activity.

### `GET /metrics`

Return aggregate marketplace metrics.

## MCP tools

`apps/mcp-server` exposes StellarMesh to MCP-compatible agents.

Tools:

- `discover_service`
- `browse_service`
- `access_service`
- `check_reputation`
- `register_service`

Recommended use:

1. `discover_service`
2. `browse_service`
3. `access_service`
4. call the provider directly from the agent's own wallet-aware client

## Agent model

Agents should use StellarMesh like this:

1. discover providers through StellarMesh
2. compare them by price, capability fit, and reputation
3. fetch access instructions for the chosen service
4. pay the provider directly from the agent's own wallet
5. consume the provider response

That keeps payment custody with the agent while letting StellarMesh stay focused on discovery and onboarding.

## Local setup

### Prerequisites

- Node.js 20+
- npm
- Rust + Cargo if working on contracts
- Stellar CLI if working on contracts
- a Stellar testnet wallet for direct provider-payment testing

### Install

```powershell
cmd /c npm install
```

### Build

```powershell
cmd /c npm run build
```

### Local services

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

## Environment variables

### Provider services

Provider apps need:

- `X402_FACILITATOR_URL`
- `X402_FACILITATOR_API_KEY` when using the hosted facilitator
- provider public key env vars
- `MPP_SECRET_KEY` where MPP is enabled
- `COMMITMENT_PUBLIC_HEX` and `SEARCH_CHANNEL_CONTRACT` for the search `MPP channel` example

### Marketplace API

The API no longer needs to hold a payer wallet to fulfill the core product promise.

It needs:

- service and reputation state
- contract IDs
- provider metadata

### MCP

- `STELLARMESH_API_URL`

### Dashboard

- `VITE_STELLARMESH_API_URL`

## Registration rules

StellarMesh only lists services that expose valid payment challenges.

### x402 requirement

Declared `x402` endpoints must return:

- `HTTP 402`
- `PAYMENT-REQUIRED`

### MPP requirement

Declared `MPP` endpoints must return:

- `HTTP 402`
- `WWW-Authenticate`
- `method="stellar"`
- `intent="charge"` or `intent="channel"` as appropriate

If a service does not pass verification, registration fails.

## Manual testing

### 1. Discover services

```powershell
Invoke-RestMethod "https://stellarmeshapi.onrender.com/services"
Invoke-RestMethod "https://stellarmeshapi.onrender.com/services?capability=web-search"
```

### 2. Inspect one service

```powershell
Invoke-RestMethod "https://stellarmeshapi.onrender.com/services/svc-search-brave"
```

### 3. Fetch access instructions

```powershell
Invoke-RestMethod "https://stellarmeshapi.onrender.com/services/svc-search-brave/access"
Invoke-RestMethod "https://stellarmeshapi.onrender.com/services/svc-search-brave/access?usage=repeat"
```

### 4. Verify registration protection

Submit a deliberately invalid endpoint and confirm registration is rejected.

### 5. Verify provider challenge directly

```powershell
@'
const response = await fetch("http://127.0.0.1:4101/x402/search", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query: "stellar" })
});
console.log(response.status);
console.log(response.headers.get("payment-required"));
'@ | node --input-type=module -
```

### 6. Verify direct x402 payment from an agent-side client

```powershell
@'
import { fetchViaX402 } from "./apps/api/dist/payments/x402Client.js";

const result = await fetchViaX402("http://127.0.0.1:4101/x402/search", {
  query: "stellar"
});

console.log(JSON.stringify(result, null, 2));
'@ | node --input-type=module -
```

This test proves an agent-side wallet-aware client can pay the provider directly. It is not the marketplace API buying on the agent's behalf.

## Dashboard

The dashboard is intentionally human-facing. It should communicate:

- what services exist
- how agents connect
- how providers list services
- how direct wallet-based payment works

It should not imply that StellarMesh centrally purchases services for agents.

## Deployed URLs

- Search service: [stellarmeshsearch.onrender.com](https://stellarmeshsearch.onrender.com)
- Weather service: [stellarmeshweather.onrender.com](https://stellarmeshweather.onrender.com)
- Inference service: [stellarmeshinference.onrender.com](https://stellarmeshinference.onrender.com)
- API: [stellarmeshapi.onrender.com](https://stellarmeshapi.onrender.com)

## Contracts

Current contract information remains in [REAL_TESTNET_STATUS.md](C:\Users\singa\Downloads\stellar-hacks\REAL_TESTNET_STATUS.md).

You can inspect contracts in Stellar Lab:

- [Stellar Lab](https://developers.stellar.org/docs/tools/lab)
- [Contract Explorer](https://developers.stellar.org/es/docs/tools/lab/smart-contracts/contract-explorer)

## References

- [Built on Stellar x402 Facilitator overview](https://channels.openzeppelin.com/testnet/gen)
- [Stellar Agentic Payments docs](https://developers.stellar.org/docs/build/agentic-payments)
- [Stellar Lab](https://developers.stellar.org/docs/tools/lab)
