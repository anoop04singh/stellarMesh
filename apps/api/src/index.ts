import cors from "cors";
import express from "express";
import { z } from "zod";
import { readDb } from "./db.js";
import { hireService } from "./orchestrator.js";
import { getService, listServices, registerService, updateReputation } from "./registry.js";

const app = express();
app.use(cors());
app.use(express.json());

const hireSchema = z.object({
  serviceId: z.string().min(3),
  sessionId: z.string().min(3),
  taskPayload: z.record(z.string(), z.unknown()),
});

const rateSchema = z.object({
  status: z.enum(["success", "failed"]),
  amountUsd: z.number().nonnegative(),
});

app.get("/health", (_req, res) => {
  res.json({ name: "stellarmesh-api", status: "ok" });
});

app.get("/services", async (req, res, next) => {
  try {
    const services = await listServices({
      capability: req.query.capability ? String(req.query.capability) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      paymentMethod: req.query.paymentMethod === "x402" || req.query.paymentMethod === "mpp"
        ? req.query.paymentMethod
        : undefined,
    });
    res.json({ services });
  } catch (error) {
    next(error);
  }
});

app.post("/services/register", async (req, res, next) => {
  try {
    const service = await registerService(req.body);
    res.status(201).json({ service });
  } catch (error) {
    next(error);
  }
});

app.get("/services/:id", async (req, res, next) => {
  try {
    const service = await getService(req.params.id);
    if (!service) {
      res.status(404).json({ error: "Service not found." });
      return;
    }
    res.json({ service });
  } catch (error) {
    next(error);
  }
});

app.post("/services/:id/rate", async (req, res, next) => {
  try {
    const payload = rateSchema.parse(req.body);
    const reputation = await updateReputation(req.params.id, payload.status, payload.amountUsd);
    if (!reputation) {
      res.status(404).json({ error: "Service not found." });
      return;
    }
    res.json({ reputation });
  } catch (error) {
    next(error);
  }
});

app.post("/hire", async (req, res, next) => {
  try {
    const payload = hireSchema.parse(req.body);
    const result = await hireService(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/activity", async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({ activity: db.activity });
  } catch (error) {
    next(error);
  }
});

app.get("/metrics", async (_req, res, next) => {
  try {
    const db = await readDb();
    const totalVolumeUsd = Object.values(db.reputation).reduce((sum, item) => sum + item.totalVolumeUsd, 0);
    const totalSettlements = Object.values(db.reputation).reduce(
      (sum, item) => sum + item.successfulSettlements + item.failedSettlements,
      0,
    );
    res.json({
      metrics: {
        serviceCount: db.services.filter(service => service.active).length,
        totalVolumeUsd: Number(totalVolumeUsd.toFixed(2)),
        totalSettlements,
        avgReputation: Math.round(
          Object.values(db.reputation).reduce((sum, item) => sum + item.score, 0) /
            Math.max(Object.values(db.reputation).length, 1),
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(400).json({ error: message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`StellarMesh API listening on http://localhost:${port}`);
});
