import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { USDC_SAC_TESTNET } from "@stellar/mpp";
import { stellar } from "@stellar/mpp/charge/server";
import { Mppx, Store } from "mppx/server";

dotenv.config({ path: ".env.testnet.local", quiet: true });

const app = express();
app.use(helmet());
app.use(express.json());

const providerAddress = process.env.WEATHER_PROVIDER_PUBLIC;
const facilitatorUrl = process.env.X402_FACILITATOR_URL ?? "http://localhost:4022";
const mppSecret = process.env.MPP_SECRET_KEY;

if (!providerAddress || !mppSecret) {
  throw new Error("Missing WEATHER_PROVIDER_PUBLIC or MPP_SECRET_KEY");
}

app.use(
  paymentMiddlewareFromConfig(
    {
      "POST /x402/weather": {
        accepts: {
          scheme: "exact",
          price: `$${process.env.WEATHER_X402_PRICE ?? "0.01"}`,
          network: "stellar:testnet",
          payTo: providerAddress,
        },
      },
    },
    new HTTPFacilitatorClient({ url: facilitatorUrl }),
    [{ network: "stellar:testnet", server: new ExactStellarScheme() }],
  ),
);

const chargeVerifier = Mppx.create({
  secretKey: mppSecret,
  methods: [
    stellar.charge({
      recipient: providerAddress,
      currency: USDC_SAC_TESTNET,
      network: "stellar:testnet",
      store: Store.memory(),
    }),
  ],
});

function buildForecast(location: string, method: string) {
  return {
    provider: "Sky Pulse",
    paymentMethod: method,
    forecast: {
      location,
      temperatureC: 28,
      condition: "Partly cloudy",
      humidity: 62,
      windKph: 14,
    },
  };
}

app.post("/x402/weather", (req, res) => {
  const location = String(req.body.location ?? "Bengaluru");
  res.json(buildForecast(location, "x402"));
});

app.post("/mpp/charge/weather", async (req, res) => {
  const webReq = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
  });

  const result = await chargeVerifier.charge({
    amount: "0.01",
    description: "Sky Pulse weather feed",
  })(webReq);

  if (result.status === 402) {
    const challenge = result.challenge;
    res.status(challenge.status);
    challenge.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(await challenge.text());
    return;
  }

  const location = String(req.body.location ?? "Bengaluru");
  const receipt = result.withReceipt(Response.json(buildForecast(location, "mpp-charge")));
  res.status(receipt.status);
  receipt.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(await receipt.text());
});

const port = Number(process.env.PORT ?? 4102);

app.listen(port, () => {
  console.log(`Sky Pulse real service listening on http://localhost:${port}`);
});
