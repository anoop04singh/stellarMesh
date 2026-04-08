# StellarMesh MCP Server

This MCP server exposes StellarMesh as a discovery and access layer for paid services on Stellar.

It is not a centralized buyer. Agents should use it to discover providers, inspect services, retrieve access instructions, and register new services. Payment stays with the agent's own wallet.

## Live API

- API base URL: `https://stellarmeshapi.onrender.com`

## Tools

- `discover_service`
- `browse_service`
- `access_service`
- `agent_wallet_status`
- `check_reputation`
- `register_service`
- `get_mpp_channel_setup_guide`

## What agents should do

1. Discover providers.
2. Inspect service metadata and reputation.
3. Request access instructions.
4. Pay the provider directly from the agent's own wallet-aware client.

## Setup

### Clone the repository

```powershell
git clone https://github.com/anoop04singh/stellarMesh.git
cd stellarMesh
```

### Install and build

```powershell
cmd /c npm install
cmd /c npm run build -w @stellarmesh/mcp-server
```

## Attach StellarMesh MCP to your agent

Use this flow for Claude Desktop, Codex-compatible hosts, and other MCP clients.

1. Clone the repository:

```powershell
git clone https://github.com/anoop04singh/stellarMesh.git
cd stellarMesh
```

2. Install dependencies:

```powershell
cmd /c npm install
```

3. Build the MCP server:

```powershell
cmd /c npm run build -w @stellarmesh/mcp-server
```

4. Point the MCP process at the live marketplace API:

```powershell
$env:STELLARMESH_API_URL="https://stellarmeshapi.onrender.com"
```

5. Inject the agent wallet into the MCP host from your `.env` values:

```powershell
$env:PAYER_SECRET="YOUR_AGENT_WALLET_SECRET"
$env:PAYER_PUBLIC="YOUR_AGENT_WALLET_PUBLIC"
$env:COMMITMENT_SECRET_HEX="YOUR_MPP_COMMITMENT_SECRET_HEX"
$env:STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
```

Notes:

- `PAYER_PUBLIC` is the public address of the same wallet represented by `PAYER_SECRET`. It is recommended for all agent setups and required for MPP channel flows.
- `COMMITMENT_SECRET_HEX` is required only for `MPP channel`. It is not needed for plain `x402` or `MPP charge`.

Notes:

- `PAYER_PUBLIC` is the public address of the same wallet represented by `PAYER_SECRET`. It is recommended for all agent setups and required for MPP channel flows.
- `COMMITMENT_SECRET_HEX` is required only for `MPP channel`. It is not needed for plain `x402` or `MPP charge`.

6. Add the built server to your agent host configuration.

7. Restart the host.

8. Verify these tools appear:
   - `discover_service`
   - `browse_service`
   - `access_service`
   - `agent_wallet_status`
   - `check_reputation`
   - `register_service`
   - `get_mpp_channel_setup_guide`

9. Run `agent_wallet_status` and confirm the wallet is ready before asking the agent to pay providers.

10. If your agent host supports extra skills or project instructions, attach:
   - `.codex/skills/stellarmesh-agent/SKILL.md`
   - `.codex/skills/stellarmesh-mpp-channel/SKILL.md`

## Run

```powershell
$env:STELLARMESH_API_URL="https://stellarmeshapi.onrender.com"
$env:PAYER_SECRET="YOUR_AGENT_WALLET_SECRET"
$env:PAYER_PUBLIC="YOUR_AGENT_WALLET_PUBLIC"
$env:COMMITMENT_SECRET_HEX="YOUR_MPP_COMMITMENT_SECRET_HEX"
$env:STELLAR_RPC_URL="https://soroban-testnet.stellar.org"
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
        "STELLARMESH_API_URL": "https://stellarmeshapi.onrender.com",
        "PAYER_SECRET": "YOUR_AGENT_WALLET_SECRET",
        "PAYER_PUBLIC": "YOUR_AGENT_WALLET_PUBLIC",
        "COMMITMENT_SECRET_HEX": "YOUR_MPP_COMMITMENT_SECRET_HEX",
        "STELLAR_RPC_URL": "https://soroban-testnet.stellar.org"
      }
    }
  }
}
```

## Add StellarMesh MCP to an agent

Use this pattern for any MCP-capable agent host:

1. Clone the repository from GitHub.
2. Build the MCP server.
3. Point `STELLARMESH_API_URL` at the deployed API.
4. Pass the agent wallet env vars from `.env` into the MCP config:
   - `PAYER_SECRET`
   - `PAYER_PUBLIC`
   - `COMMITMENT_SECRET_HEX`
   - `STELLAR_RPC_URL`
5. Add the MCP server command to the agent host configuration.
6. Restart the agent host and verify the tools appear.

Repository:

- [github.com/anoop04singh/stellarMesh](https://github.com/anoop04singh/stellarMesh)

Expected tools after setup:

- `discover_service`
- `browse_service`
- `access_service`
- `agent_wallet_status`
- `check_reputation`
- `register_service`
- `get_mpp_channel_setup_guide`

## Codex / local agent example

```json
{
  "mcpServers": {
    "stellarmesh": {
      "command": "node",
      "args": [
        "C:\\path\\to\\stellarMesh\\apps\\mcp-server\\dist\\index.js"
      ],
      "env": {
        "STELLARMESH_API_URL": "https://stellarmeshapi.onrender.com",
        "PAYER_SECRET": "YOUR_AGENT_WALLET_SECRET",
        "PAYER_PUBLIC": "YOUR_AGENT_WALLET_PUBLIC",
        "COMMITMENT_SECRET_HEX": "YOUR_MPP_COMMITMENT_SECRET_HEX",
        "STELLAR_RPC_URL": "https://soroban-testnet.stellar.org"
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

### `agent_wallet_status`

Confirm that the MCP host has a Stellar wallet configured for direct payments.

It reports:

- public key
- network and RPC URL
- whether `PAYER_SECRET` is configured
- whether `COMMITMENT_SECRET_HEX` is configured
- whether `x402`, `MPP charge`, and `MPP channel` payment clients are ready

## Generate `COMMITMENT_SECRET_HEX`

`COMMITMENT_SECRET_HEX` is a dedicated raw Ed25519 seed for MPP channel commitments. It is not a normal Stellar secret string.

Generate it with:

```powershell
@'
import { Keypair } from "@stellar/stellar-sdk";

const keypair = Keypair.random();
console.log("COMMITMENT_SECRET_HEX=" + keypair.rawSecretKey().toString("hex"));
console.log("COMMITMENT_PUBLIC_HEX=" + keypair.rawPublicKey().toString("hex"));
'@ | node --input-type=module -
```

Use it this way:

- the agent keeps `COMMITMENT_SECRET_HEX`
- the provider uses the matching `COMMITMENT_PUBLIC_HEX`
- do not reuse the main wallet key for channel commitments

## Generate `COMMITMENT_SECRET_HEX`

`COMMITMENT_SECRET_HEX` is a dedicated raw Ed25519 seed for MPP channel commitments. It is not a normal Stellar secret string.

Generate it with:

```powershell
@'
import { Keypair } from "@stellar/stellar-sdk";

const keypair = Keypair.random();
console.log("COMMITMENT_SECRET_HEX=" + keypair.rawSecretKey().toString("hex"));
console.log("COMMITMENT_PUBLIC_HEX=" + keypair.rawPublicKey().toString("hex"));
'@ | node --input-type=module -
```

Use it this way:

- the agent keeps `COMMITMENT_SECRET_HEX`
- the provider uses the matching `COMMITMENT_PUBLIC_HEX`
- do not reuse the main wallet key for channel commitments

### `check_reputation`

Read current trust and settlement signals.

### `register_service`

Register a provider only after it exposes valid `x402` or `MPP` payment challenges.

### `get_mpp_channel_setup_guide`

Return the end-to-end A-to-Z guide for MPP session channels, including:

- when to choose charge vs channel
- required env vars and packages
- commitment key handling
- provider-side verification
- client-side setup
- persistence rules
- close and settlement guidance
