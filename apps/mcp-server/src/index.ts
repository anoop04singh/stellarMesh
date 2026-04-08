import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const apiBaseUrl = process.env.STELLARMESH_API_URL ?? "https://stellarmeshapi.onrender.com";

async function api<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${pathname}`, init);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

const server = new McpServer({ name: "stellarmesh-mcp", version: "0.1.0" });
const registerServiceSchema = {
  name: z.string().min(3),
  description: z.string().min(8),
  endpointUrl: z.string().url(),
  priceUsd: z.number().positive(),
  capabilityTags: z.array(z.string().min(2)).min(1),
  paymentMethods: z.array(z.enum(["x402", "mpp"])).min(1),
  ownerAddress: z.string().min(8),
  stakeUsd: z.number().min(0).default(0),
  network: z.string().default("stellar:testnet"),
  x402Endpoint: z.string().url().optional(),
  mppChargeEndpoint: z.string().url().optional(),
  mppChannelEndpoint: z.string().url().optional(),
};

server.tool(
  "discover_service",
  "Search the live StellarMesh marketplace by capability, max price, and payment method.",
  {
    capability: z.string().optional(),
    maxPrice: z.number().positive().optional(),
    paymentMethod: z.enum(["x402", "mpp"]).optional(),
  },
  async ({ capability, maxPrice, paymentMethod }) => {
    const params = new URLSearchParams();
    if (capability) params.set("capability", capability);
    if (maxPrice) params.set("maxPrice", String(maxPrice));
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    const result = await api<{ services: unknown[] }>(`/services?${params.toString()}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "browse_service",
  "Fetch a service profile, including metadata and reputation, before deciding whether to use it.",
  { serviceId: z.string() },
  async ({ serviceId }) => {
    const result = await api(`/services/${serviceId}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "access_service",
  "Get access instructions for a StellarMesh service so an agent can pay from its own wallet and call the provider directly.",
  {
    serviceId: z.string(),
    usage: z.enum(["single", "repeat"]).optional(),
  },
  async ({ serviceId, usage }) => {
    const params = new URLSearchParams();
    if (usage) params.set("usage", usage);
    const result = await api(`/services/${serviceId}/access${params.size ? `?${params.toString()}` : ""}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "check_reputation",
  "Fetch live StellarMesh service metadata together with the current reputation snapshot.",
  { serviceId: z.string() },
  async ({ serviceId }) => {
    const result = await api(`/services/${serviceId}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "register_service",
  "Register a paid service in StellarMesh after the API verifies its x402 or MPP payment challenge.",
  registerServiceSchema,
  async ({
    name,
    description,
    endpointUrl,
    priceUsd,
    capabilityTags,
    paymentMethods,
    ownerAddress,
    stakeUsd,
    network,
    x402Endpoint,
    mppChargeEndpoint,
    mppChannelEndpoint,
  }) => {
    const result = await api("/services/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        endpointUrl,
        priceUsd,
        capabilityTags,
        paymentMethods,
        ownerAddress,
        stakeUsd,
        metadata: {
          network,
          endpoints: {
            ...(x402Endpoint ? { x402: x402Endpoint } : {}),
            ...(mppChargeEndpoint ? { mppCharge: mppChargeEndpoint } : {}),
            ...(mppChannelEndpoint ? { mppChannel: mppChannelEndpoint } : {}),
          },
        },
      }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
