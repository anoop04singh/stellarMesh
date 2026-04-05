import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { x402Facilitator } from "@x402/core/facilitator";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/facilitator";

dotenv.config({ path: ".env.testnet.local", quiet: true });

const facilitatorSecret = process.env.FACILITATOR_STELLAR_PRIVATE_KEY;
if (!facilitatorSecret) {
  throw new Error("FACILITATOR_STELLAR_PRIVATE_KEY is required in .env.testnet.local");
}

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const facilitator = new x402Facilitator().register(
  "stellar:testnet",
  new ExactStellarScheme([createEd25519Signer(facilitatorSecret)], {
    rpcConfig: {
      url: process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
    },
    maxTransactionFeeStroops: Number(process.env.MAX_TRANSACTION_FEE_STROOPS ?? "100000"),
  }),
);

app.post("/verify", async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body as {
    paymentPayload: unknown;
    paymentRequirements: unknown;
  };
  const result = await facilitator.verify(paymentPayload as never, paymentRequirements as never);
  res.json(result);
});

app.post("/settle", async (req, res) => {
  const { paymentPayload, paymentRequirements } = req.body as {
    paymentPayload: unknown;
    paymentRequirements: unknown;
  };
  try {
    const result = await facilitator.settle(paymentPayload as never, paymentRequirements as never);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown settle error";
    res.status(400).json({ success: false, errorReason: message, network: "stellar:testnet" });
  }
});

app.get("/supported", (_req, res) => {
  res.json(facilitator.getSupported());
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = Number(process.env.FACILITATOR_PORT ?? 4022);
app.listen(port, () => {
  console.log(`StellarMesh facilitator listening on http://localhost:${port}`);
});
