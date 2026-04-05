import {
  computeRankingScore,
  type DiscoveryFilters,
  nowIso,
  type ReputationRecord,
  type ServiceRecord,
  slugify,
} from "@stellarmesh/shared";
import { z } from "zod";
import { appendActivity, readDb, writeDb } from "./db.js";

const endpointSchema = z.object({
  x402: z.string().url().optional(),
  mppCharge: z.string().url().optional(),
  mppChannel: z.string().url().optional(),
});

const serviceSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(8),
  endpointUrl: z.string().url(),
  priceUsd: z.number().positive(),
  capabilityTags: z.array(z.string().min(2)).min(1),
  paymentMethods: z.array(z.enum(["x402", "mpp"])).min(1),
  ownerAddress: z.string().min(8),
  stakeUsd: z.number().min(0).default(0),
  metadata: z.object({
    network: z.string().optional(),
    demo: z.boolean().optional(),
    endpoints: endpointSchema.default({}),
  }).catch({
    endpoints: {},
  }),
});

export async function listServices(filters: DiscoveryFilters) {
  const db = await readDb();
  return db.services
    .filter(service => service.active)
    .filter(service => (filters.capability ? service.capabilityTags.includes(filters.capability) : true))
    .filter(service => (filters.maxPrice ? service.priceUsd <= filters.maxPrice : true))
    .filter(service =>
      filters.paymentMethod ? service.paymentMethods.includes(filters.paymentMethod) : true,
    )
    .map(service => ({
      ...service,
      rankingScore: computeRankingScore(service, db.reputation[service.id]),
      reputation: db.reputation[service.id] ?? null,
    }))
    .sort((a, b) => b.rankingScore - a.rankingScore);
}

export async function getService(serviceId: string) {
  const db = await readDb();
  const service = db.services.find(item => item.id === serviceId);
  if (!service) return null;
  return {
    ...service,
    reputation: db.reputation[service.id] ?? null,
  };
}

export async function registerService(input: unknown): Promise<ServiceRecord> {
  const payload = serviceSchema.parse(input);
  const db = await readDb();
  const id = `svc-${slugify(payload.name)}`;

  if (db.services.some(service => service.id === id)) {
    throw new Error(`A service with id ${id} is already registered.`);
  }

  const verification = await verifyServiceEndpoints(payload);
  const service: ServiceRecord = {
    id,
    active: true,
    ...payload,
    metadata: {
      ...payload.metadata,
      verification,
    },
  };
  db.services.push(service);
  db.reputation[service.id] = {
    serviceId: service.id,
    successfulSettlements: 0,
    failedSettlements: 0,
    score: 50,
    uptime: 1,
    totalVolumeUsd: 0,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(db);
  await appendActivity({
    type: "service.registered",
    serviceId: service.id,
    status: "success",
    message: `${service.name} registered in the marketplace.`,
    metadata: {
      verification,
    },
  });
  return service;
}

type RegistrationPayload = z.infer<typeof serviceSchema>;

type VerificationRecord = {
  checkedAt: string;
  endpoints: {
    x402?: string;
    mppCharge?: string;
    mppChannel?: string;
  };
};

async function verifyServiceEndpoints(payload: RegistrationPayload): Promise<VerificationRecord> {
  const endpoints = payload.metadata.endpoints ?? {};
  const verified: VerificationRecord["endpoints"] = {};

  if (payload.paymentMethods.includes("x402")) {
    const x402Url = endpoints.x402 ?? payload.endpointUrl;
    await verifyX402Endpoint(x402Url);
    verified.x402 = x402Url;
  }

  if (payload.paymentMethods.includes("mpp")) {
    const mppChannelUrl = endpoints.mppChannel;
    const mppChargeUrl = endpoints.mppCharge;

    if (!mppChannelUrl && !mppChargeUrl) {
      throw new Error(
        "Services that declare MPP support must provide metadata.endpoints.mppCharge or metadata.endpoints.mppChannel.",
      );
    }

    if (mppChannelUrl) {
      await verifyMppEndpoint(mppChannelUrl, "channel");
      verified.mppChannel = mppChannelUrl;
    }

    if (mppChargeUrl) {
      await verifyMppEndpoint(mppChargeUrl, "charge");
      verified.mppCharge = mppChargeUrl;
    }
  }

  return {
    checkedAt: nowIso(),
    endpoints: verified,
  };
}

async function verifyX402Endpoint(url: string): Promise<void> {
  const response = await probeEndpoint(url);

  if (response.status !== 402) {
    throw new Error(`Declared x402 endpoint ${url} did not return HTTP 402.`);
  }

  const paymentRequired = response.headers.get("payment-required");
  if (!paymentRequired) {
    throw new Error(`Declared x402 endpoint ${url} did not include a payment-required header.`);
  }
}

async function verifyMppEndpoint(url: string, expectedIntent: "charge" | "channel"): Promise<void> {
  const response = await probeEndpoint(url);

  if (response.status !== 402) {
    throw new Error(`Declared MPP endpoint ${url} did not return HTTP 402.`);
  }

  const authenticate = response.headers.get("www-authenticate");
  if (!authenticate) {
    throw new Error(`Declared MPP endpoint ${url} did not include a WWW-Authenticate header.`);
  }

  const method = extractChallengeAttribute(authenticate, "method");
  const intent = extractChallengeAttribute(authenticate, "intent");

  if (method !== "stellar") {
    throw new Error(`Declared MPP endpoint ${url} did not advertise method="stellar".`);
  }

  if (intent !== expectedIntent) {
    throw new Error(`Declared MPP endpoint ${url} did not advertise intent="${expectedIntent}".`);
  }
}

async function probeEndpoint(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        probe: true,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not verify endpoint ${url}: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

function extractChallengeAttribute(header: string, key: string): string | null {
  const match = new RegExp(`${key}="([^"]+)"`, "i").exec(header);
  return match?.[1] ?? null;
}

export async function updateReputation(
  serviceId: string,
  outcome: "success" | "failed",
  amountUsd: number,
): Promise<ReputationRecord | null> {
  const db = await readDb();
  const reputation = db.reputation[serviceId];
  if (!reputation) return null;

  if (outcome === "success") {
    reputation.successfulSettlements += 1;
    reputation.totalVolumeUsd = Number((reputation.totalVolumeUsd + amountUsd).toFixed(4));
  } else {
    reputation.failedSettlements += 1;
  }

  const total = reputation.successfulSettlements + reputation.failedSettlements;
  const reliability = total === 0 ? 1 : reputation.successfulSettlements / total;
  reputation.uptime = Number(Math.max(0.8, reliability).toFixed(3));
  reputation.score = Math.max(
    1,
    Math.min(
      100,
      Math.round(reputation.successfulSettlements * 5 + reputation.uptime * 60 - reputation.failedSettlements * 7),
    ),
  );
  reputation.updatedAt = new Date().toISOString();

  await writeDb(db);
  await appendActivity({
    type: "reputation.updated",
    serviceId,
    status: outcome,
    amountUsd,
    message: `Reputation updated after ${outcome} settlement.`,
  });
  return reputation;
}
