import {
  computeRankingScore,
  type DiscoveryFilters,
  type ReputationRecord,
  type ServiceRecord,
  slugify,
} from "@stellarmesh/shared";
import { z } from "zod";
import { appendActivity, readDb, writeDb } from "./db.js";

const serviceSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(8),
  endpointUrl: z.string().url(),
  priceUsd: z.number().positive(),
  capabilityTags: z.array(z.string().min(2)).min(1),
  paymentMethods: z.array(z.enum(["x402", "mpp"])).min(1),
  ownerAddress: z.string().min(8),
  stakeUsd: z.number().min(0).default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
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
  const service: ServiceRecord = {
    id: `svc-${slugify(payload.name)}`,
    active: true,
    ...payload,
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
  });
  return service;
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
