# StellarMesh MPP Channel Skill

Use this file when an agent or provider needs to set up Stellar MPP session channels correctly from prerequisites through settlement and close.

## When to use it

- Use `x402` for one-off paid requests.
- Use `MPP charge` for one-off MPP payments.
- Use `MPP channel` when the same agent will call the same provider repeatedly in one session.

## What the skill covers

- deciding between charge and channel
- channel prerequisites
- required env vars and packages
- provider-side verification flow
- agent-side client setup
- funding and deposits
- persistence and replay protection
- close and settlement rules

## StellarMesh flow

1. Discover a provider through StellarMesh.
2. Inspect the service.
3. Request access instructions with `access_service(serviceId, "repeat")`.
4. Use the returned `mppChannel` endpoint.
5. Pay the provider directly from the agent's own wallet-aware client.

## Key rule

Do not confuse the main Stellar wallet secret with the raw Ed25519 commitment seed used for MPP channels.

Variable meaning:

- `PAYER_PUBLIC` is the public address of the paying Stellar wallet
- `COMMITMENT_SECRET_HEX` is a separate raw Ed25519 seed used only for MPP channel commitments

Generate the commitment keypair with Node:

```ts
import { Keypair } from "@stellar/stellar-sdk";

const keypair = Keypair.random();
console.log("COMMITMENT_SECRET_HEX=" + keypair.rawSecretKey().toString("hex"));
console.log("COMMITMENT_PUBLIC_HEX=" + keypair.rawPublicKey().toString("hex"));
```

## References in this repo

- Provider example: `apps/demo-search-service/src/index.ts`
- Client example: `apps/api/src/payments/mppClient.ts`
- Full source skill: `.codex/skills/stellarmesh-mpp-channel/SKILL.md`
