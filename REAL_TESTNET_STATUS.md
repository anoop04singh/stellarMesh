# Real Testnet Status

## What is already real

- Testnet accounts generated and funded with XLM via Friendbot
- USDC trustlines created for payer and provider accounts
- Local x402 facilitator app wired for Stellar testnet
- Real Soroban contracts deployed:
  - `ServiceRegistry`: `CBRHMSJCSGJH4QBL76CSHIWRNL6PPX4UHA7AJQBZCF2TC7JBVTOBQ6TJ`
  - `ReputationLedger`: `CDR5CG2FDMEE3EBC3BCFEKDOQ7GJWHBJWJ6VKTBXVFGUYTGHBSEUUK6X`
- Real one-way channel contract deployed for search MPP path:
  - `Search channel`: `CAPXHIKCZ2PFDOGEMSMH5OVBCPHVRROMK5L3C6QM6FFB5Y4HWOQCMTEM`
- Three provider services registered on-chain in `ServiceRegistry`

## Live verification completed

The payer wallet has been funded and the live testnet flow is working end-to-end.

Verified payer address:

`GCYIZEVDNOQ3ULF2RLFIMJ6NBNJ63W44YSZW7QWTBDU6IOQNZTXNCQIC`

Verified flows:

- `Atlas Search` settles via real `x402`
- `Atlas Search` upgrades to real `MPP channel` after repeated calls in the same session
- `Sky Pulse` settles via real `x402`
- `Sky Pulse` upgrades to real `MPP charge`
- `Mesh Inference` settles via real `x402`

Hybrid routing verification:

- Session `live-hybrid` used `x402` on calls `1-3`
- Session `live-hybrid` switched to `MPP` on calls `4-5`

## Environment file

Generated local environment:

- [C:\Users\singa\Downloads\stellar-hacks\.env.testnet.local](C:\Users\singa\Downloads\stellar-hacks\.env.testnet.local)

Generated bootstrap record:

- [C:\Users\singa\Downloads\stellar-hacks\data\testnet-bootstrap.json](C:\Users\singa\Downloads\stellar-hacks\data\testnet-bootstrap.json)

## Current runtime

Live services are configured on:

- API: `http://localhost:4000`
- Facilitator: `http://localhost:4022`
- Search: `http://localhost:4101`
- Weather: `http://localhost:4102`
- Inference: `http://localhost:4103`

## Search channel top-up command

Run from the repo root to add more liquidity to the search MPP channel:

```powershell
Get-Content '.env.testnet.local' | ForEach-Object {
  if ($_ -match '^(.*?)=(.*)$') { Set-Item -Path ("env:" + $matches[1]) -Value $matches[2] }
}

& 'C:\Program Files (x86)\Stellar CLI\stellar.exe' contract invoke `
  --id $env:SEARCH_CHANNEL_CONTRACT `
  --source-account $env:PAYER_SECRET `
  --network-passphrase 'Test SDF Network ; September 2015' `
  --rpc-url 'https://soroban-testnet.stellar.org' `
  --send yes `
  -- top_up --amount 1000000
```

That tops up the channel with `0.1 USDC` in stroops-style 7-decimal base units.

## Start commands

```powershell
cmd /c npm run build
cmd /c npm run dev:facilitator
cmd /c npm run dev:search
cmd /c npm run dev:weather
cmd /c npm run dev:inference
cmd /c npm run dev:api
cmd /c npm run dev:dashboard
cmd /c npm run dev:mcp
```

## Live flow expectation

- First few hires for a service route through `x402`
- Repeated calls within the same session switch to `MPP` when supported
- The dashboard shows route changes and settlements from the live API activity log
