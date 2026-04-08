import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { Mppx, Store } from "mppx/server";
import { stellar } from "@stellar/mpp/channel/server";
import { StrKey } from "@stellar/stellar-sdk";

dotenv.config({ path: ".env.testnet.local", quiet: true });

const app = express();
app.use(helmet());
app.use(express.json());

const providerAddress = process.env.SEARCH_PROVIDER_PUBLIC;
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "https://channels.openzeppelin.com/x402/testnet";
const facilitatorApiKey = process.env.X402_FACILITATOR_API_KEY;
const channelContract = process.env.SEARCH_CHANNEL_CONTRACT;
const commitmentPubkey = process.env.COMMITMENT_PUBLIC_HEX;
const mppSecret = process.env.MPP_SECRET_KEY;
const payerPublic = process.env.PAYER_PUBLIC;

if (!providerAddress || !channelContract || !commitmentPubkey || !mppSecret || !payerPublic) {
  throw new Error(
    "Missing SEARCH_PROVIDER_PUBLIC, SEARCH_CHANNEL_CONTRACT, COMMITMENT_PUBLIC_HEX, MPP_SECRET_KEY, or PAYER_PUBLIC",
  );
}

app.use(
  paymentMiddlewareFromConfig(
    {
      "POST /x402/search": {
        accepts: {
          scheme: "exact",
          price: `$${process.env.SEARCH_X402_PRICE ?? "0.02"}`,
          network: "stellar:testnet",
          payTo: providerAddress,
        },
      },
    },
    new HTTPFacilitatorClient({
      url: facilitatorUrl,
      createAuthHeaders: facilitatorApiKey
        ? async () => ({
            supported: { Authorization: `Bearer ${facilitatorApiKey}` },
            verify: { Authorization: `Bearer ${facilitatorApiKey}` },
            settle: { Authorization: `Bearer ${facilitatorApiKey}` },
          })
        : undefined,
    }),
    [{ network: "stellar:testnet", server: new ExactStellarScheme() }],
  ),
);

const channelVerifier = Mppx.create({
  secretKey: mppSecret,
  methods: [
    stellar.channel({
      channel: channelContract,
      commitmentKey: StrKey.encodeEd25519PublicKey(Buffer.from(commitmentPubkey, "hex")),
      store: Store.memory(),
      network: "stellar:testnet",
      sourceAccount: payerPublic,
    }),
  ],
});

function buildSearchResults(query: string, method: string) {
  return {
    provider: "Atlas Search",
    paymentMethod: method,
    results: [
      {
        title: `Search hit for "${query}"`,
        snippet: "A paid search response settled on Stellar testnet.",
        source: "https://developers.stellar.org/docs/build/agentic-payments",
      },
      {
        title: "Marketplace design signal",
        snippet: "Service discovery and paid agent APIs are explicit hackathon demand signals.",
        source: "https://github.com/stellar/x402-stellar",
      },
    ],
  };
}

app.post("/x402/search", (req, res) => {
  const query = String(req.body.query ?? "unknown topic");
  res.json(buildSearchResults(query, "x402"));
});

app.get("/health", (_req, res) => {
  res.json({ name: "atlas-search", status: "ok" });
});

app.post("/mpp/channel/search", async (req, res) => {
  const webReq = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
  });

  const result = await channelVerifier.channel({
    amount: "0.02",
    description: "Atlas Search channel access",
  })(webReq);

  if (result.status === 402) {
    const challenge = result.challenge;
    res.status(challenge.status);
    challenge.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(await challenge.text());
    return;
  }

  const query = String(req.body.query ?? "unknown topic");
  const receipt = result.withReceipt(Response.json(buildSearchResults(query, "mpp-channel")));
  res.status(receipt.status);
  receipt.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(await receipt.text());
});

const port = Number(process.env.PORT ?? 4101);

app.listen(port, () => {
  console.log(`Atlas Search real service listening on http://localhost:${port}`);
});
