import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

dotenv.config({ path: ".env.testnet.local", quiet: true });

const app = express();
app.use(helmet());
app.use(express.json());

const providerAddress = process.env.INFERENCE_PROVIDER_PUBLIC;
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "http://localhost:4022";

if (!providerAddress) {
  throw new Error("Missing INFERENCE_PROVIDER_PUBLIC");
}

app.use(
  paymentMiddlewareFromConfig(
    {
      "POST /x402/infer": {
        accepts: {
          scheme: "exact",
          price: `$${process.env.INFERENCE_X402_PRICE ?? "0.03"}`,
          network: "stellar:testnet",
          payTo: providerAddress,
        },
      },
    },
    new HTTPFacilitatorClient({ url: facilitatorUrl }),
    [{ network: "stellar:testnet", server: new ExactStellarScheme() }],
  ),
);

app.post("/x402/infer", (req, res) => {
  const text = String(req.body.text ?? req.body.prompt ?? "No text provided.");
  res.json({
    provider: "Mesh Inference",
    paymentMethod: "x402",
    summary: text.length > 120 ? `${text.slice(0, 117)}...` : text,
    label: text.toLowerCase().includes("urgent") ? "priority" : "normal",
  });
});

app.listen(4103, () => {
  console.log("Mesh Inference real service listening on http://localhost:4103");
});
