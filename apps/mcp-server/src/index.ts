import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const apiBaseUrl = process.env.STELLARMESH_API_URL ?? "http://localhost:4000";

async function api<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${pathname}`, init);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

const server = new McpServer({ name: "stellarmesh-mcp", version: "0.1.0" });

server.tool(
  "discover_service",
  "Search StellarMesh services by capability and max price.",
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
  "hire_service",
  "Hire a StellarMesh service, route payment via x402 or MPP, and return the result.",
  {
    serviceId: z.string(),
    sessionId: z.string(),
    taskPayload: z.record(z.string(), z.unknown()),
  },
  async ({ serviceId, sessionId, taskPayload }) => {
    const result = await api("/hire", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ serviceId, sessionId, taskPayload }),
    });
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

server.tool(
  "check_reputation",
  "Fetch service metadata with the current reputation snapshot.",
  { serviceId: z.string() },
  async ({ serviceId }) => {
    const result = await api(`/services/${serviceId}`);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
