import dotenv from "dotenv";
import { wrapFetchWithPayment, x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

dotenv.config({ path: ".env.testnet.local", quiet: true });

let fetchWithPayment: typeof fetch | null = null;

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.stack || error.name;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getFetchWithPayment() {
  if (fetchWithPayment) return fetchWithPayment;

  const payerSecret = process.env.PAYER_SECRET;
  if (!payerSecret) {
    throw new Error("PAYER_SECRET is required in .env.testnet.local");
  }

  const signer = createEd25519Signer(payerSecret, "stellar:testnet");
  const paymentClient = new x402Client().register(
    "stellar:*",
    new ExactStellarScheme(signer, {
      url: process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
    }),
  );

  const httpClient = new x402HTTPClient(paymentClient);
  fetchWithPayment = wrapFetchWithPayment(fetch, httpClient);
  return fetchWithPayment;
}

export async function fetchViaX402(url: string, body: Record<string, unknown>) {
  const paidFetch = getFetchWithPayment();
  let response: Response;
  try {
    response = await paidFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`x402 paid request failed before settlement: ${describeError(error)}`);
  }

  if (!response.ok) {
    throw new Error(`x402 paid request failed with status ${response.status}`);
  }

  return response.json();
}
