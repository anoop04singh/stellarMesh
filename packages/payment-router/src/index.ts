import { type PaymentDecision, type PaymentMethod } from "@stellarmesh/shared";

export interface RouterState {
  sessionId: string;
  serviceId: string;
  callCount: number;
  activeChannel?: {
    openedAt: string;
    reference: string;
  };
}

export interface RouterOptions {
  channelUpgradeThreshold: number;
}

export function choosePaymentMethod(
  state: RouterState,
  supportedMethods: PaymentMethod[],
  options: RouterOptions,
): PaymentDecision {
  const supportsMpp = supportedMethods.includes("mpp");
  const shouldUseChannel = supportsMpp && state.callCount >= options.channelUpgradeThreshold;

  if (shouldUseChannel) {
    return {
      method: "mpp",
      reason: state.activeChannel
        ? "Active MPP channel already exists for this session."
        : "Repeated calls crossed the session threshold, so MPP is cheaper than per-request x402.",
      callCount: state.callCount,
    };
  }

  return {
    method: "x402",
    reason: "Defaulting to per-request settlement until the repeated-call threshold is reached.",
    callCount: state.callCount,
  };
}

export function buildChannelReference(sessionId: string, serviceId: string): string {
  return `mpp-${serviceId}-${sessionId}`;
}
