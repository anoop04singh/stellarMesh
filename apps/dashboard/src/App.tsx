import { useEffect, useState } from "react";

type Metrics = {
  serviceCount: number;
  totalVolumeUsd: number;
  totalSettlements: number;
  avgReputation: number;
};

type Service = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  capabilityTags: string[];
  rankingScore: number;
  reputation: {
    score: number;
    successfulSettlements: number;
    totalVolumeUsd: number;
  } | null;
};

type Activity = {
  id: string;
  message: string;
  createdAt: string;
  paymentMethod?: string;
  amountUsd?: number;
};

const apiBaseUrl = import.meta.env.VITE_STELLARMESH_API_URL ?? "http://localhost:4000";

async function getJson<T>(pathname: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${pathname}`);
  return (await response.json()) as T;
}

export function App() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      const [metricsResult, servicesResult, activityResult] = await Promise.all([
        getJson<{ metrics: Metrics }>("/metrics"),
        getJson<{ services: Service[] }>("/services"),
        getJson<{ activity: Activity[] }>("/activity"),
      ]);
      if (!active) return;
      setMetrics(metricsResult.metrics);
      setServices(servicesResult.services);
      setActivity(activityResult.activity.slice(0, 8));
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">StellarMesh</p>
          <h1>Autonomous Agent Service Network</h1>
          <p className="lede">
            Agents discover paid services, route settlement through x402 or MPP, and build trust
            from live usage.
          </p>
        </div>
        <div className="highlight">
          <span>Live Stack</span>
          <strong>x402 + MPP + MCP + Soroban-ready registry</strong>
        </div>
      </section>

      <section className="metrics">
        <MetricCard label="Active Services" value={metrics?.serviceCount ?? 0} />
        <MetricCard label="USDC Volume" value={`$${metrics?.totalVolumeUsd ?? 0}`} />
        <MetricCard label="Settlements" value={metrics?.totalSettlements ?? 0} />
        <MetricCard label="Avg Reputation" value={metrics?.avgReputation ?? 0} />
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Service Catalog</h2>
            <p>Ranked by capability fit, price, and reputation.</p>
          </div>
          <div className="service-list">
            {services.map(service => (
              <article key={service.id} className="service-card">
                <div className="service-topline">
                  <h3>{service.name}</h3>
                  <span>${service.priceUsd.toFixed(2)}</span>
                </div>
                <p>{service.description}</p>
                <div className="tags">
                  {service.capabilityTags.map(tag => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="service-footer">
                  <strong>Rank {service.rankingScore}</strong>
                  <span>Rep {service.reputation?.score ?? "n/a"}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Network Feed</h2>
            <p>Discovery, routing, hiring, and settlement activity.</p>
          </div>
          <ul className="feed">
            {activity.map(item => (
              <li key={item.id}>
                <div>
                  <strong>{item.message}</strong>
                  <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                </div>
                <small>
                  {item.paymentMethod ? item.paymentMethod.toUpperCase() : "network"}
                  {typeof item.amountUsd === "number" ? ` • $${item.amountUsd.toFixed(2)}` : ""}
                </small>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
