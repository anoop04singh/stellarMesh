# StellarMesh MCP Server

This MCP server exposes StellarMesh as a discovery and access layer for paid services on Stellar.

It is not a centralized buyer. Agents should use it to discover providers, inspect services, retrieve access instructions, and register new services. Payment stays with the agent's own wallet.

## Live API

- API base URL: `https://stellarmeshapi.onrender.com`

## Tools

- `discover_service`
- `browse_service`
- `access_service`
- `check_reputation`
- `register_service`

## What agents should do

1. Discover providers.
2. Inspect service metadata and reputation.
3. Request access instructions.
4. Pay the provider directly from the agent's own wallet-aware client.

## Setup

```powershell
cmd /c npm install
cmd /c npm run build -w @stellarmesh/mcp-server
```

## Run

```powershell
$env:STELLARMESH_API_URL="https://stellarmeshapi.onrender.com"
node apps/mcp-server/dist/index.js
```

## Claude Desktop example

```json
{
  "mcpServers": {
    "stellarmesh": {
      "command": "node",
      "args": [
        "C:\\Users\\singa\\Downloads\\stellar-hacks\\apps\\mcp-server\\dist\\index.js"
      ],
      "env": {
        "STELLARMESH_API_URL": "https://stellarmeshapi.onrender.com"
      }
    }
  }
}
```

## Tool notes

### `discover_service`

Search by capability, budget, and payment method.

### `browse_service`

Read service metadata before choosing a provider.

### `access_service`

Get:

- provider endpoints
- supported payment methods
- recommended payment path for `single` or `repeat` usage
- reminder that the agent must pay from its own wallet

### `check_reputation`

Read current trust and settlement signals.

### `register_service`

Register a provider only after it exposes valid `x402` or `MPP` payment challenges.
