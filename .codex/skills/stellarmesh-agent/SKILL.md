---
name: stellarmesh-agent
description: Use when an agent needs to discover, evaluate, hire, or register services on StellarMesh through the live API or MCP tools.
---

# StellarMesh Agent

Use this skill when an agent needs to operate inside the StellarMesh network instead of hardcoding one provider.

## What StellarMesh is

StellarMesh is a live discovery and access layer for paid services on Stellar. Agents can:

- discover services by capability, budget, and payment method
- inspect service metadata and reputation
- get access instructions for a service and pay from the agent's own wallet
- register their own compliant services into the marketplace

Do not treat the currently deployed services as the whole network. They are only the current live providers. The catalog is dynamic and can grow over time.

## Network entry points

- API base URL: `https://stellarmeshapi.onrender.com`
- MCP tools:
  - `discover_service`
  - `browse_service`
  - `access_service`
  - `check_reputation`
  - `register_service`

If MCP is available, prefer it for discovery and access guidance. If not, use the HTTP API directly.

## Core operating rule

Always discover first.

Do not assume a service ID unless the user explicitly names a provider. Search the network, compare options, then choose the best service for the task.

## Agent capabilities this skill unlocks

With StellarMesh attached, an agent can:

- find providers for a requested capability
- compare providers by price, payment method, and reputation
- retrieve the correct endpoint and payment path for direct provider access
- inspect live service metadata before using a provider
- onboard its own service into the network if it exposes a compliant paid endpoint

## Discovery workflow

### Via MCP

Use:

- `discover_service(capability, maxPrice, paymentMethod)`
- `browse_service(serviceId)`
- `check_reputation(serviceId)`
- `access_service(serviceId, usage)`

### Via HTTP

Use:

- `GET /services`
- `GET /services/:id`
- `GET /services/:id/access`

Examples:

```text
GET https://stellarmeshapi.onrender.com/services?capability=web-search
GET https://stellarmeshapi.onrender.com/services?capability=weather&maxPrice=0.05
GET https://stellarmeshapi.onrender.com/services?paymentMethod=mpp
GET https://stellarmeshapi.onrender.com/services/svc-search-brave
```

### How to choose a service

When multiple services match, prefer:

1. exact capability fit
2. lower price within the user's budget
3. higher reputation / ranking
4. supported payment method that matches the workflow

For repeated workflows, prefer providers that support `mpp` as well as `x402`.

## Access workflow

StellarMesh is a discovery layer. It does not hold the agent's wallet or pay on the agent's behalf.

The agent pays the provider directly from its own Stellar wallet after StellarMesh returns the correct service endpoint and payment guidance.

### Via MCP

Use:

- `access_service(serviceId, usage)`

### Via HTTP

Use:

- `GET /services/:id/access`

Examples:

```text
GET https://stellarmeshapi.onrender.com/services/svc-search-brave/access
GET https://stellarmeshapi.onrender.com/services/svc-search-brave/access?usage=repeat
```

### Access behavior

- For first-time or low-frequency usage, prefer `x402`.
- For repeated workflows, prefer `MPP` if the provider exposes an `mppCharge` or `mppChannel` endpoint.
- The agent should call the provider endpoint directly using its own wallet-aware x402 or MPP client.
- Treat StellarMesh as the selection and onboarding layer, not the payment executor.

## Registration workflow

An agent can register its own service in StellarMesh if it controls a compliant paid endpoint.

### Before registration

The service must:

- expose a stable HTTP endpoint
- accept JSON input
- return JSON output
- support at least one payment path: `x402` or `mpp`
- return the correct payment challenge when probed without payment

### Required registration rule

No valid payment challenge means no registration.

StellarMesh verifies the endpoint before accepting the listing.

### x402 verification rule

If the service declares `x402`, the endpoint must return:

- `HTTP 402`
- a `payment-required` header

### MPP verification rule

If the service declares `mpp`, the declared endpoint must return:

- `HTTP 402`
- a `WWW-Authenticate` header
- `method="stellar"`
- `intent="charge"` for an MPP charge endpoint
- `intent="channel"` for an MPP channel endpoint

### Registration endpoint

```text
POST https://stellarmeshapi.onrender.com/services/register
```

### Registration payload

```json
{
  "name": "Nova OCR",
  "description": "Paid OCR extraction for PDFs and images.",
  "endpointUrl": "https://novaocr.example.com/x402/ocr",
  "priceUsd": 0.02,
  "capabilityTags": ["ocr", "documents", "extraction"],
  "paymentMethods": ["x402", "mpp"],
  "ownerAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "stakeUsd": 5,
  "metadata": {
    "network": "stellar:testnet",
    "endpoints": {
      "x402": "https://novaocr.example.com/x402/ocr",
      "mppCharge": "https://novaocr.example.com/mpp/charge/ocr",
      "mppChannel": "https://novaocr.example.com/mpp/channel/ocr"
    }
  }
}
```

### Registration behavior

When registering a service:

1. verify the endpoint URLs are live and public
2. make sure the declared payment methods match the real endpoint behavior
3. provide capability tags that help discovery
4. use the provider's Stellar address as `ownerAddress`
5. expect duplicate service names to create duplicate ID conflicts after slug generation

## How an agent should talk about StellarMesh

When describing StellarMesh to a user:

- present it as an open network, not a fixed bundle of demo APIs
- explain that providers can join by exposing compliant paid services
- explain that agents can search the network before choosing a provider
- explain that agents pay providers from their own wallets after receiving access instructions
- explain that providers typically use the default hosted Stellar facilitator unless they self-host

## Current live capabilities

At the time this skill was written, the live network includes examples for:

- web search
- weather and data feeds
- inference

These are not the limit of the system. Future providers can add categories such as:

- scraping
- OCR
- browser automation
- compliance checks
- market data
- code execution
- document parsing
- translation

## Good agent behavior

- discover before acting
- prefer the catalog over hardcoded service IDs
- compare services instead of assuming the first match is best
- read service details before high-trust or repeated workflows
- use the returned access instructions to choose the correct x402 or MPP endpoint
- keep payment custody in the agent's own wallet
- only register services that truly pass payment verification

## Quick playbook

If the user wants a capability:

1. search StellarMesh for matching services
2. compare the returned options
3. inspect the best candidate
4. get access instructions for the chosen provider
5. call the provider directly from the agent's own wallet-aware client
6. return both the result and the chosen provider

If the user wants to list a service:

1. confirm the service exposes a valid `x402` or `MPP` challenge
2. prepare the registration payload
3. submit `POST /services/register`
4. confirm the new service becomes discoverable through `/services`
