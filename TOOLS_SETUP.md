# Tools Setup

## Already installed into Codex skills

Installed locally at `C:\Users\singa\.codex\skills\`:

- `stellar-dev`
- `setup-stellar-contracts`
- `develop-secure-contracts`
- `upgrade-stellar-contracts`

Restart Codex to guarantee new skills are picked up cleanly.

## Recommended MCP servers

### x402 Stellar MCP

Repo:

- `C:\Users\singa\Downloads\stellar-hacks\refs\x402-mcp-stellar`

Purpose:

- pay x402-protected endpoints directly from an MCP client

Setup:

1. Create `.env` from `.env.example`
2. Fill:
   - `STELLAR_SECRET_KEY`
   - `STELLAR_NETWORK`
   - optionally `STELLAR_RPC_URL`
   - optionally `X402_FACILITATOR_URL`
   - optionally `X402_FACILITATOR_API_KEY`
3. Install deps:

```bash
cd C:\Users\singa\Downloads\stellar-hacks\refs\x402-mcp-stellar
npm install
```

Run:

```bash
npm run dev
```

### Stellar XDR MCP

Repo:

- `C:\Users\singa\Downloads\stellar-hacks\refs\mcp-stellar-xdr`

Purpose:

- decode and encode Stellar XDR
- debug x402 payloads, transaction envelopes, auth entries, and contract events

Run pattern from repo README:

```bash
npx deno run --allow-read https://github.com/leighmcculloch/mcp-stellar-xdr/raw/refs/heads/main/mcp-stellar-xdr.ts
```

## Recommended dev repos already cloned locally

- `C:\Users\singa\Downloads\stellar-hacks\refs\x402-stellar`
- `C:\Users\singa\Downloads\stellar-hacks\refs\x402-mcp-stellar`
- `C:\Users\singa\Downloads\stellar-hacks\refs\stellar-mpp-sdk`
- `C:\Users\singa\Downloads\stellar-hacks\refs\stellar-sponsored-agent-account`
- `C:\Users\singa\Downloads\stellar-hacks\refs\stellar-dev-skill`
- `C:\Users\singa\Downloads\stellar-hacks\refs\openzeppelin-skills`
- `C:\Users\singa\Downloads\stellar-hacks\refs\mcp-stellar-xdr`

## Fastest starter stack

### Contracts

- Stellar CLI
- Rust
- OpenZeppelin Stellar contracts tooling

### Backend

- `x402-stellar` simple-paywall patterns
- `stellar-mpp-sdk` charge and channel examples

### Agent tooling

- `x402-mcp-stellar`
- `stellar-sponsored-agent-account`
- `mcp-stellar-xdr`

### Frontend

- React/Vite for speed

## Suggested next step

Scaffold a fresh monorepo and copy only the minimum viable pieces from:

- `x402-stellar/examples/simple-paywall`
- `stellar-mpp-sdk/examples`
- `x402-mcp-stellar/src`
