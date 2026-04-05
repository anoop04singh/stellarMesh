import {
  buildChannelReference,
  choosePaymentMethod,
  type RouterState,
} from "@stellarmesh/payment-router";
import { nowIso, type HireRequest, type PaymentMethod } from "@stellarmesh/shared";
import { appendActivity, readDb } from "./db.js";
import { fetchViaMppChannel, fetchViaMppCharge } from "./payments/mppClient.js";
import { fetchViaX402 } from "./payments/x402Client.js";
import { updateReputation } from "./registry.js";

const sessionState = new Map<string, RouterState>();

interface HireResult {
  serviceId: string;
  method: PaymentMethod;
  reason: string;
  settlementReference: string;
  result: unknown;
  callCount: number;
  serviceName: string;
}

export async function hireService(request: HireRequest): Promise<HireResult> {
  const db = await readDb();
  const service = db.services.find(item => item.id === request.serviceId && item.active);
  if (!service) {
    throw new Error("Service not found or inactive.");
  }

  const key = `${request.sessionId}:${request.serviceId}`;
  const previousState = sessionState.get(key);
  const state: RouterState = {
    sessionId: request.sessionId,
    serviceId: request.serviceId,
    callCount: (previousState?.callCount ?? 0) + 1,
    activeChannel: previousState?.activeChannel,
  };

  const decision = choosePaymentMethod(state, service.paymentMethods, {
    channelUpgradeThreshold: 4,
  });

  if (decision.method === "mpp" && !state.activeChannel) {
    state.activeChannel = {
      openedAt: nowIso(),
      reference: buildChannelReference(request.sessionId, request.serviceId),
    };
  }
  sessionState.set(key, state);

  await appendActivity({
    type: "payment.routed",
    serviceId: request.serviceId,
    sessionId: request.sessionId,
    paymentMethod: decision.method,
    amountUsd: service.priceUsd,
    status: "success",
    message: `Payment router selected ${decision.method.toUpperCase()} for ${service.name}.`,
    metadata: {
      callCount: state.callCount,
      reason: decision.reason,
    },
  });

  const endpoints = (service.metadata.endpoints ?? {}) as Record<string, string>;
  const result = await executePaidCall(decision.method, endpoints, service.endpointUrl, request.taskPayload);
  const settlementReference =
    decision.method === "mpp"
      ? state.activeChannel?.reference ?? buildChannelReference(request.sessionId, request.serviceId)
      : `x402-${request.serviceId}-${request.sessionId}-${state.callCount}`;

  await appendActivity({
    type: "service.hired",
    serviceId: request.serviceId,
    sessionId: request.sessionId,
    paymentMethod: decision.method,
    amountUsd: service.priceUsd,
    status: "success",
    message: `${service.name} completed a paid request.`,
  });

  await appendActivity({
    type: "payment.settled",
    serviceId: request.serviceId,
    sessionId: request.sessionId,
    paymentMethod: decision.method,
    amountUsd: service.priceUsd,
    status: "success",
    message: `Settlement recorded with ${decision.method.toUpperCase()} reference ${settlementReference}.`,
  });

  await updateReputation(request.serviceId, "success", service.priceUsd);

  return {
    serviceId: request.serviceId,
    serviceName: service.name,
    method: decision.method,
    reason: decision.reason,
    settlementReference,
    callCount: state.callCount,
    result,
  };
}

async function executePaidCall(
  method: PaymentMethod,
  endpoints: Record<string, string>,
  fallbackUrl: string,
  taskPayload: Record<string, unknown>,
) {
  switch (method) {
    case "x402":
      return fetchViaX402(endpoints.x402 ?? fallbackUrl, taskPayload);
    case "mpp":
      if (endpoints.mppChannel) {
        return fetchViaMppChannel(endpoints.mppChannel, taskPayload);
      }
      if (endpoints.mppCharge) {
        return fetchViaMppCharge(endpoints.mppCharge, taskPayload);
      }
      return fetchViaX402(endpoints.x402 ?? fallbackUrl, taskPayload);
    default:
      return fetchViaX402(fallbackUrl, taskPayload);
  }
}
