import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const apiBaseUrl = process.env.STELLARMESH_API_URL ?? "https://stellarmeshapi.onrender.com";
const walletPublic = process.env.PAYER_PUBLIC ?? null;
const walletSecretConfigured = Boolean(process.env.PAYER_SECRET);
const commitmentSecretConfigured = Boolean(process.env.COMMITMENT_SECRET_HEX);
const stellarRpcUrl = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";

const mppChannelGuide = `# StellarMesh MPP Channel Setup Guide

Use MPP charge for one-off payments and MPP channel for repeated usage against the same provider.

## When to use MPP channel

- choose \`x402\` for infrequent paid calls
- choose \`MPP charge\` for one-off wallet-native MPP payments
- choose \`MPP channel\` when an agent will call the same service repeatedly in a session

## What a channel-based integration needs

1. A provider endpoint that returns an MPP channel challenge on unpaid requests.
2. A deployed one-way payment channel contract on Stellar.
3. A commitment keypair dedicated to channel commitments.
4. An initial USDC deposit in the channel.
5. Persistent provider-side storage for the highest cumulative amount and signature seen so far.
6. A close flow that settles the final cumulative amount on-chain.

## Required packages

Provider:
- \`mppx/server\`
- \`@stellar/mpp/channel/server\`

Agent or client:
- \`mppx/client\`
- \`@stellar/mpp/channel/client\`
- \`@stellar/stellar-sdk\`

## Required values

Provider or service side:
- \`MPP_SECRET_KEY\`
- channel contract address such as \`SEARCH_CHANNEL_CONTRACT\`
- commitment public key hex such as \`COMMITMENT_PUBLIC_HEX\`
- source account public key that funded the channel

Agent or wallet side:
- payer Stellar secret or wallet signer
- payer public key
- commitment secret hex such as \`COMMITMENT_SECRET_HEX\`

## Commitment key rule

The channel flow uses a raw Ed25519 commitment key, not a normal Stellar secret string for the commitment seed. The provider stores or derives the public key, and the agent keeps the matching secret key.

Provider example:

\`\`\`ts
stellar.channel({
  channel: process.env.SEARCH_CHANNEL_CONTRACT!,
  commitmentKey: StrKey.encodeEd25519PublicKey(
    Buffer.from(process.env.COMMITMENT_PUBLIC_HEX!, "hex")
  ),
  store: Store.memory(),
  network: "stellar:testnet",
  sourceAccount: process.env.PAYER_PUBLIC!,
})
\`\`\`

Agent example:

\`\`\`ts
stellarChannel.channel({
  commitmentKey: Keypair.fromRawEd25519Seed(
    Buffer.from(process.env.COMMITMENT_SECRET_HEX!, "hex")
  ),
  sourceAccount: process.env.PAYER_PUBLIC!,
})
\`\`\`

## Provider setup

1. Install the channel server packages.
2. Create an \`Mppx\` verifier with \`stellar.channel(...)\`.
3. Configure:
   - channel contract
   - commitment public key
   - provider-side store
   - network
   - source account
4. On unpaid requests, return the channel challenge.
5. On paid requests, verify the cumulative commitment and return the service response with a receipt.

This repo's search provider is the reference implementation:
- \`apps/demo-search-service/src/index.ts\`

## Agent setup

1. Install the channel client packages.
2. Create an \`Mppx\` client with \`stellarChannel.channel(...)\`.
3. Load:
   - \`PAYER_PUBLIC\`
   - \`COMMITMENT_SECRET_HEX\`
4. Use the provider's \`mppChannel\` endpoint returned by StellarMesh \`access_service\`.
5. Let the wallet-owning agent pay the provider directly.

This repo's client-side reference lives in:
- \`apps/api/src/payments/mppClient.ts\`

## Funding and deposits

Before a channel can be used, the payer must:

1. hold testnet USDC
2. fund the channel deposit
3. make sure the provider and client agree on:
   - channel contract
   - currency
   - source account
   - commitment keypair
   - network

Without deposit funding, the channel may challenge correctly but settlement will fail.

## Persistence and replay safety

Do not treat the provider-side store as optional in production.

The provider must persist the highest cumulative amount and signature it has accepted so it can:
- prevent replay or rollback
- close the channel using the best known state
- survive restarts

\`Store.memory()\` is fine for demos but not enough for a production provider.

## Closing the channel

When the session ends, the provider closes using the highest valid cumulative commitment it has stored.

The documented server-side close flow uses:
- \`@stellar/mpp/channel/server\`
- channel contract
- final cumulative amount
- final signature
- a fee payer signer
- the correct network

If the provider cannot recover the highest valid state, it risks losing earned value.

## Testing checklist

1. Probe the endpoint without payment and confirm:
   - \`HTTP 402\`
   - \`WWW-Authenticate\`
   - \`method="stellar"\`
   - \`intent="channel"\`
2. Call the endpoint through an MPP channel client.
3. Make repeated calls in the same session.
4. Confirm the provider store advances only forward.
5. Close the channel using the highest stored amount and signature.
6. Verify the settled amount on Stellar testnet.

## Common mistakes

- using MPP channel when MPP charge is enough
- confusing a Stellar secret string with the raw commitment seed hex
- not persisting the highest cumulative amount and signature
- not funding the channel deposit
- mismatching the channel contract, source account, or network between client and provider
- exposing an MPP channel endpoint that does not return a valid \`intent="channel"\` challenge

## How StellarMesh fits

StellarMesh is the discovery and access layer.

Use StellarMesh to:
- discover providers
- inspect the service metadata
- fetch the \`mppChannel\` endpoint through \`access_service\`

Then let the wallet-owning agent talk to the provider directly.
`;

async function api<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${pathname}`, init);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

function getWalletStatus() {
  const x402Ready = walletSecretConfigured;
  const mppChargeReady = walletSecretConfigured;
  const mppChannelReady = walletSecretConfigured && Boolean(walletPublic) && commitmentSecretConfigured;

  return {
    walletOwner: "agent",
    network: "stellar:testnet",
    rpcUrl: stellarRpcUrl,
    publicKey: walletPublic,
    configured: {
      payerSecret: walletSecretConfigured,
      payerPublic: Boolean(walletPublic),
      commitmentSecretHex: commitmentSecretConfigured,
    },
    supportedPaymentClients: {
      x402: x402Ready,
      mppCharge: mppChargeReady,
      mppChannel: mppChannelReady,
    },
    note:
      "The MCP host injects the agent wallet through env vars. The private key stays with the agent host and is used for direct provider payments, not sent to StellarMesh.",
  };
}

const server = new McpServer({ name: "stellarmesh-mcp", version: "0.1.0" });

const registerServiceSchema = {
  name: z.string().min(3),
  description: z.string().min(8),
  endpointUrl: z.string().url(),
  priceUsd: z.number().positive(),
  capabilityTags: z.array(z.string().min(2)).min(1),
  paymentMethods: z.array(z.enum(["x402", "mpp"])).min(1),
  ownerAddress: z.string().min(8),
  stakeUsd: z.number().min(0).default(0),
  network: z.string().default("stellar:testnet"),
  x402Endpoint: z.string().url().optional(),
  mppChargeEndpoint: z.string().url().optional(),
  mppChannelEndpoint: z.string().url().optional(),
};

server.tool(
  "discover_service",
  "Search the live StellarMesh marketplace by capability, max price, and payment method.",
  {
    capability: z.string().optional(),
    maxPrice: z.number().positive().optional(),
    paymentMethod: z.enum(["x402", "mpp"]).optional(),
  },
  async ({ capability, maxPrice, paymentMethod }) => {
    const params = new URLSearchParams();
    if (capability) params.set("capability", capability);
    if (maxPrice) params.set("maxPrice", String(maxPrice));
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    const result = await api<{ services: unknown[] }>(`/services?${params.toString()}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "browse_service",
  "Fetch a service profile, including metadata and reputation, before deciding whether to use it.",
  { serviceId: z.string() },
  async ({ serviceId }) => {
    const result = await api(`/services/${serviceId}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "access_service",
  "Get access instructions for a StellarMesh service so an agent can pay from its own wallet and call the provider directly.",
  {
    serviceId: z.string(),
    usage: z.enum(["single", "repeat"]).optional(),
  },
  async ({ serviceId, usage }) => {
    const params = new URLSearchParams();
    if (usage) params.set("usage", usage);
    const result = await api(`/services/${serviceId}/access${params.size ? `?${params.toString()}` : ""}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "agent_wallet_status",
  "Show whether the MCP host has a Stellar wallet configured for x402 and MPP payments, without exposing the private key.",
  {},
  async () => ({
    content: [{ type: "text", text: JSON.stringify(getWalletStatus(), null, 2) }],
  }),
);

server.tool(
  "check_reputation",
  "Fetch live StellarMesh service metadata together with the current reputation snapshot.",
  { serviceId: z.string() },
  async ({ serviceId }) => {
    const result = await api(`/services/${serviceId}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "register_service",
  "Register a paid service in StellarMesh after the API verifies its x402 or MPP payment challenge.",
  registerServiceSchema,
  async ({
    name,
    description,
    endpointUrl,
    priceUsd,
    capabilityTags,
    paymentMethods,
    ownerAddress,
    stakeUsd,
    network,
    x402Endpoint,
    mppChargeEndpoint,
    mppChannelEndpoint,
  }) => {
    const result = await api("/services/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        endpointUrl,
        priceUsd,
        capabilityTags,
        paymentMethods,
        ownerAddress,
        stakeUsd,
        metadata: {
          network,
          endpoints: {
            ...(x402Endpoint ? { x402: x402Endpoint } : {}),
            ...(mppChargeEndpoint ? { mppCharge: mppChargeEndpoint } : {}),
            ...(mppChannelEndpoint ? { mppChannel: mppChannelEndpoint } : {}),
          },
        },
      }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "get_mpp_channel_setup_guide",
  "Return the end-to-end guide for setting up Stellar MPP channel payments so an agent or provider can implement repeated session payments correctly.",
  {},
  async () => ({
    content: [{ type: "text", text: mppChannelGuide }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
