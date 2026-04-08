import dotenv from "dotenv";
import { Keypair } from "@stellar/stellar-sdk";
import { Mppx } from "mppx/client";
import { stellar as stellarCharge } from "@stellar/mpp/charge/client";
import { stellar as stellarChannel } from "@stellar/mpp/channel/client";

dotenv.config({ path: ".env.testnet.local", quiet: true });

let initialized = false;

function ensureMppClient() {
  if (initialized) return;

  const payerSecret = process.env.PAYER_SECRET;
  const payerPublic = process.env.PAYER_PUBLIC;
  const commitmentSecret = process.env.COMMITMENT_SECRET_HEX;
  if (!payerSecret || !payerPublic || !commitmentSecret) {
    throw new Error("PAYER_SECRET, PAYER_PUBLIC, and COMMITMENT_SECRET_HEX are required in .env.testnet.local");
  }

  Mppx.create({
    methods: [
      stellarCharge.charge({
        keypair: Keypair.fromSecret(payerSecret),
      }),
      stellarChannel.channel({
        commitmentKey: Keypair.fromRawEd25519Seed(Buffer.from(commitmentSecret, "hex")),
        sourceAccount: payerPublic,
      }),
    ],
  });

  initialized = true;
}

export async function fetchViaMppCharge(url: string, body: Record<string, unknown>) {
  ensureMppClient();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MPP charge request failed with status ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
    );
  }
  return response.json();
}

export async function fetchViaMppChannel(url: string, body: Record<string, unknown>) {
  ensureMppClient();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `MPP channel request failed with status ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
    );
  }
  return response.json();
}
