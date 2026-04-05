export type PaymentMethod = "x402" | "mpp";

export interface ServiceRecord {
  id: string;
  name: string;
  description: string;
  endpointUrl: string;
  priceUsd: number;
  capabilityTags: string[];
  paymentMethods: PaymentMethod[];
  ownerAddress: string;
  stakeUsd: number;
  active: boolean;
  metadata: Record<string, unknown>;
}

export interface ReputationRecord {
  serviceId: string;
  successfulSettlements: number;
  failedSettlements: number;
  score: number;
  uptime: number;
  totalVolumeUsd: number;
  updatedAt: string;
}

export interface ActivityRecord {
  id: string;
  type:
    | "service.registered"
    | "service.hired"
    | "payment.settled"
    | "payment.routed"
    | "reputation.updated";
  serviceId?: string;
  sessionId?: string;
  paymentMethod?: PaymentMethod;
  amountUsd?: number;
  status?: "success" | "failed";
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface RegistryDatabase {
  services: ServiceRecord[];
  reputation: Record<string, ReputationRecord>;
  activity: ActivityRecord[];
}

export interface DiscoveryFilters {
  capability?: string;
  maxPrice?: number;
  paymentMethod?: PaymentMethod;
}

export interface HireRequest {
  serviceId: string;
  sessionId: string;
  taskPayload: Record<string, unknown>;
}

export interface PaymentDecision {
  method: PaymentMethod;
  reason: string;
  callCount: number;
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function computeRankingScore(service: ServiceRecord, reputation?: ReputationRecord): number {
  const score = reputation?.score ?? 50;
  const uptime = reputation?.uptime ?? 0.9;
  const pricePenalty = Math.min(service.priceUsd * 60, 10);
  return Number((score * 0.7 + uptime * 20 - pricePenalty).toFixed(2));
}
