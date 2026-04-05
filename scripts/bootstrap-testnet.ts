import dotenv from "dotenv";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

dotenv.config({ path: ".env.testnet.local", quiet: true });

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIEND_BOT = "https://friendbot.stellar.org";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC_ASSET = new Asset("USDC", USDC_ISSUER);
const server = new Horizon.Server(HORIZON_URL);

type BootstrapAccount = {
  name: string;
  keypair: Keypair;
};

const names = [
  "payer",
  "search_provider",
  "weather_provider",
  "inference_provider",
  "facilitator",
  "registry_admin",
] as const;

async function main() {
  const accounts: BootstrapAccount[] = names.map(name => ({
    name,
    keypair: Keypair.random(),
  }));

  for (const account of accounts) {
    await fundWithFriendbot(account.keypair.publicKey());
  }

  for (const account of accounts.filter(item => item.name !== "facilitator" && item.name !== "registry_admin")) {
    await createTrustline(account.keypair, USDC_ASSET);
  }

  const commitment = Keypair.random();
  const mppSecret = `stellarmesh-${Math.random().toString(36).slice(2)}-${Date.now()}`;

  const bootstrap = {
    generatedAt: new Date().toISOString(),
    horizonUrl: HORIZON_URL,
    usdcIssuer: USDC_ISSUER,
    accounts: Object.fromEntries(
      accounts.map(account => [
        account.name,
        {
          publicKey: account.keypair.publicKey(),
          secret: account.keypair.secret(),
        },
      ]),
    ),
    commitment: {
      publicKey: Buffer.from(commitment.rawPublicKey()).toString("hex"),
      secret: Buffer.from(commitment.rawSecretKey()).toString("hex"),
    },
    mppSecret,
  };

  const root = process.cwd();
  const dataPath = path.join(root, "data", "testnet-bootstrap.json");
  const envPath = path.join(root, ".env.testnet.local");

  await fs.writeFile(dataPath, `${JSON.stringify(bootstrap, null, 2)}\n`, "utf8");

  const envText = [
    `STELLAR_NETWORK=stellar:testnet`,
    `STELLAR_RPC_URL=https://soroban-testnet.stellar.org`,
    `HORIZON_URL=${HORIZON_URL}`,
    `USDC_ISSUER=${USDC_ISSUER}`,
    `PAYER_SECRET=${bootstrap.accounts.payer.secret}`,
    `PAYER_PUBLIC=${bootstrap.accounts.payer.publicKey}`,
    `SEARCH_PROVIDER_SECRET=${bootstrap.accounts.search_provider.secret}`,
    `SEARCH_PROVIDER_PUBLIC=${bootstrap.accounts.search_provider.publicKey}`,
    `WEATHER_PROVIDER_SECRET=${bootstrap.accounts.weather_provider.secret}`,
    `WEATHER_PROVIDER_PUBLIC=${bootstrap.accounts.weather_provider.publicKey}`,
    `INFERENCE_PROVIDER_SECRET=${bootstrap.accounts.inference_provider.secret}`,
    `INFERENCE_PROVIDER_PUBLIC=${bootstrap.accounts.inference_provider.publicKey}`,
    `FACILITATOR_STELLAR_PRIVATE_KEY=${bootstrap.accounts.facilitator.secret}`,
    `REGISTRY_ADMIN_SECRET=${bootstrap.accounts.registry_admin.secret}`,
    `REGISTRY_ADMIN_PUBLIC=${bootstrap.accounts.registry_admin.publicKey}`,
    `MPP_SECRET_KEY=${mppSecret}`,
    `COMMITMENT_SECRET_HEX=${bootstrap.commitment.secret}`,
    `COMMITMENT_PUBLIC_HEX=${bootstrap.commitment.publicKey}`,
    `FACILITATOR_PORT=4022`,
    `X402_FACILITATOR_URL=http://localhost:4022`,
    `SEARCH_X402_PRICE=0.02`,
    `WEATHER_X402_PRICE=0.01`,
    `INFERENCE_X402_PRICE=0.03`,
  ].join("\n");

  await fs.writeFile(envPath, `${envText}\n`, "utf8");

  console.log("Bootstrap complete.");
  console.log(`Saved bootstrap data to ${dataPath}`);
  console.log(`Saved environment to ${envPath}`);
  console.log("");
  console.log("Manual step still required:");
  console.log(`1. Open https://faucet.circle.com`);
  console.log(`2. Select USDC on Stellar Testnet`);
  console.log(`3. Send funds to payer address: ${bootstrap.accounts.payer.publicKey}`);
  console.log("");
  console.log("All other accounts are funded with testnet XLM and already have USDC trustlines where needed.");
}

async function fundWithFriendbot(publicKey: string) {
  const url = new URL(FRIEND_BOT);
  url.searchParams.set("addr", publicKey);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Friendbot funding failed for ${publicKey}: ${await response.text()}`);
  }
}

async function createTrustline(keypair: Keypair, asset: Asset) {
  const account = await server.loadAccount(keypair.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset,
      }),
    )
    .setTimeout(60)
    .build();

  tx.sign(keypair);
  await server.submitTransaction(tx);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
