---
name: stellarmesh-mpp-channel
description: Use when an agent or provider needs to set up Stellar MPP session channels correctly from prerequisites through settlement and close.
---

# StellarMesh MPP Channel Skill

Use this skill when a provider or agent needs repeated-session payments on Stellar and must implement MPP channels correctly.

If the workflow is a one-off payment, prefer `x402` or `MPP charge`. Use `MPP channel` only when repeated access to the same provider makes a funded session worthwhile.

## What this skill is for

This skill teaches an agent how to:

- decide between `x402`, `MPP charge`, and `MPP channel`
- prepare the contract, keys, deposit, and endpoints for a channel-based flow
- implement the provider-side channel verifier
- implement the agent-side channel client
- keep the correct state to prevent replay issues
- close and settle the channel safely

## How StellarMesh fits

StellarMesh does not open or fund channels for agents.

Use StellarMesh to:

1. discover services
2. inspect the service metadata
3. fetch direct access instructions with `access_service`
4. identify whether the provider exposes an `mppChannel` endpoint

After that, the agent talks to the provider directly from its own wallet-aware client.

## Choose the right payment mode

Use `x402` when:

- you need a quick one-off paid call
- the provider exposes only `x402`

Use `MPP charge` when:

- you want wallet-native MPP payments
- the interaction is still one request at a time
- no session channel is needed

Use `MPP channel` when:

- the same agent will call the same provider repeatedly
- you want lower repeated-call overhead
- you are prepared to manage a channel contract, commitment key, deposit, and close flow

## A-to-Z prerequisites

Before building an MPP channel integration, make sure all of these exist:

1. A provider endpoint for repeated calls, for example `POST /mpp/channel/search`
2. A deployed one-way payment channel contract on Stellar
3. A payer wallet with testnet USDC
4. An initial funded deposit for the channel
5. A dedicated commitment keypair
6. A provider-side store for the highest accepted cumulative amount and signature
7. A close path that can settle the final state on-chain

If any of these pieces are missing, do not claim channel support yet.

## Required packages

Provider side:

- `mppx/server`
- `@stellar/mpp/channel/server`
- `@stellar/stellar-sdk`

Agent or client side:

- `mppx/client`
- `@stellar/mpp/channel/client`
- `@stellar/stellar-sdk`

## Required environment variables

### Provider-side

Typical values:

- `MPP_SECRET_KEY`
- `SEARCH_CHANNEL_CONTRACT` or another channel contract ID
- `COMMITMENT_PUBLIC_HEX`
- `PAYER_PUBLIC`
- `STELLAR_RPC_URL`

The provider-side reference in this repo is:

- `apps/demo-search-service/src/index.ts`

### Agent-side

Typical values:

- `PAYER_SECRET`
- `PAYER_PUBLIC`
- `COMMITMENT_SECRET_HEX`
- `STELLAR_RPC_URL`

The client-side reference in this repo is:

- `apps/api/src/payments/mppClient.ts`

Meaning:

- `PAYER_SECRET`: the main Stellar wallet secret used to fund and authorize payments
- `PAYER_PUBLIC`: the public address of that same wallet, used as the channel source account
- `COMMITMENT_SECRET_HEX`: a separate raw Ed25519 seed used only to sign MPP channel commitments

## Commitment key rule

Do not confuse the commitment key with the main Stellar wallet secret.

The channel client uses a raw Ed25519 commitment seed in hex. The provider uses the matching public key in hex and encodes it into the format expected by the channel verifier.

Generate a fresh commitment keypair with Node:

```ts
import { Keypair } from "@stellar/stellar-sdk";

const keypair = Keypair.random();
console.log("COMMITMENT_SECRET_HEX=" + keypair.rawSecretKey().toString("hex"));
console.log("COMMITMENT_PUBLIC_HEX=" + keypair.rawPublicKey().toString("hex"));
```

Keep the secret on the agent or client side. Give only the public hex to the provider.

Provider example:

```ts
stellar.channel({
  channel: process.env.SEARCH_CHANNEL_CONTRACT!,
  commitmentKey: StrKey.encodeEd25519PublicKey(
    Buffer.from(process.env.COMMITMENT_PUBLIC_HEX!, "hex")
  ),
  store: Store.memory(),
  network: "stellar:testnet",
  sourceAccount: process.env.PAYER_PUBLIC!,
})
```

Agent example:

```ts
stellarChannel.channel({
  commitmentKey: Keypair.fromRawEd25519Seed(
    Buffer.from(process.env.COMMITMENT_SECRET_HEX!, "hex")
  ),
  sourceAccount: process.env.PAYER_PUBLIC!,
})
```

## Provider implementation steps

1. Install the channel server packages.
2. Build an `Mppx` verifier with `stellar.channel(...)`.
3. Configure:
   - the channel contract
   - the commitment public key
   - the network
   - the source account
   - a persistent store
4. Expose a public endpoint such as `POST /mpp/channel/your-service`.
5. On an unpaid request:
   - return `HTTP 402`
   - return `WWW-Authenticate`
   - return `method="stellar"`
   - return `intent="channel"`
6. On a paid request:
   - verify the commitment
   - advance the stored highest cumulative amount only forward
   - return the actual service response with a receipt

The current search provider in this repo is the reference example.

## Agent implementation steps

1. Discover a provider through StellarMesh.
2. Call `access_service(serviceId, "repeat")`.
3. Read the returned `mppChannel` endpoint.
4. Create an `Mppx` client with `stellarChannel.channel(...)`.
5. Configure:
   - the payer wallet
   - the payer public key
   - the commitment secret hex
6. Call the provider directly.
7. Reuse the same session and channel state for repeated calls to that provider.

## Funding the channel

Before repeated calls begin:

1. fund the payer wallet with testnet USDC
2. deposit the intended spend amount into the channel
3. make sure the provider and client agree on:
   - network
   - channel contract
   - source account
   - currency
   - commitment keypair

Without the deposit, the channel flow is incomplete even if the endpoint returns the correct challenge.

## Storage and replay protection

Provider-side storage is not optional in production.

The provider must preserve the highest valid cumulative amount and its matching signature so it can:

- reject stale or replayed commitments
- resume after restarts
- close with the best known state

`Store.memory()` is acceptable for demos only. Replace it with durable storage for a real provider.

## Close and settlement

At the end of the session, close the channel with the highest accepted cumulative amount and signature.

The server-side close flow requires:

- the channel contract ID
- the final cumulative amount
- the final signature
- a fee-payer signer
- the correct Stellar network

If the provider loses its best known signed state, it may not be able to settle the full earned amount.

## Verification checklist

Check all of these:

1. The endpoint returns `HTTP 402` on unpaid access.
2. The endpoint returns `WWW-Authenticate`.
3. The challenge includes `method="stellar"`.
4. The challenge includes `intent="channel"`.
5. The agent can make repeated paid calls through the same channel client.
6. The provider store only moves forward.
7. The final close settles correctly on Stellar testnet.

## Common mistakes

- choosing channel mode when `MPP charge` is enough
- using a normal Stellar secret string where raw commitment hex is required
- not persisting the highest cumulative amount and signature
- forgetting to fund the deposit
- mismatching the source account between provider and client
- mismatching the channel contract between provider and client
- exposing an endpoint that claims `mpp` but does not return a real `intent="channel"` challenge

## Recommended workflow with StellarMesh

When an agent needs a repeated workflow:

1. `discover_service`
2. `browse_service`
3. `access_service(serviceId, "repeat")`
4. confirm the provider exposes `mppChannel`
5. set up the channel client from this skill
6. pay the provider directly from the agent's own wallet

StellarMesh remains the discovery layer. The channel itself belongs to the agent-provider relationship.
