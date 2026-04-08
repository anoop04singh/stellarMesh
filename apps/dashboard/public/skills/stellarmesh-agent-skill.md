# StellarMesh Agent Skill

Use this file when an agent needs to operate inside the StellarMesh network instead of hardcoding one provider.

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
  - `agent_wallet_status`
  - `check_reputation`
  - `register_service`
  - `get_mpp_channel_setup_guide`

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
- request the dedicated MPP channel setup guide before building repeated-session payment flows
- confirm the attached MCP host has a Stellar wallet ready for direct provider payments

## Discovery workflow

### Via MCP

Use:

- `discover_service(capability, maxPrice, paymentMethod)`
- `browse_service(serviceId)`
- `check_reputation(serviceId)`
- `access_service(serviceId, usage)`
- `agent_wallet_status()`
- `get_mpp_channel_setup_guide()`

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
3. higher reputation and ranking
4. supported payment method that matches the workflow

For repeated workflows, prefer providers that support `mpp` as well as `x402`.
If a workflow needs MPP session channels, fetch the MPP channel guide first and follow it before implementing the provider or agent client.

## Access workflow

StellarMesh is a discovery layer. It does not hold the agent's wallet or pay on the agent's behalf.

The agent pays the provider directly from its own Stellar wallet after StellarMesh returns the correct service endpoint and payment guidance.

Wallet variable meaning:

- `PAYER_SECRET`: the agent's main Stellar wallet secret
- `PAYER_PUBLIC`: the public address of that same wallet; recommended in general and required for MPP channel
- `COMMITMENT_SECRET_HEX`: a separate raw Ed25519 seed used only for MPP channel commitments

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

## Good agent behavior

- discover before acting
- prefer the catalog over hardcoded service IDs
- compare services instead of assuming the first match is best
- read service details before high-trust or repeated workflows
- use the returned access instructions to choose the correct provider endpoint
- use `get_mpp_channel_setup_guide` before implementing MPP session-channel flows
- keep payment custody in the agent's own wallet
- only register services that truly pass payment verification
