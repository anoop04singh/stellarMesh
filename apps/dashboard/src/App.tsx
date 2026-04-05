import { useEffect, useState, type FormEvent, type ReactNode } from "react";

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
  paymentMethods: Array<"x402" | "mpp">;
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
  status?: string;
  type?: string;
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
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    endpointUrl: "",
    priceUsd: "0.02",
    capabilityTags: "search,data",
    ownerAddress: "",
    network: "stellar:testnet",
    stakeUsd: "0",
    supportsX402: true,
    supportsMpp: false,
    x402Endpoint: "",
    mppChargeEndpoint: "",
    mppChannelEndpoint: "",
  });
  const [submitState, setSubmitState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });

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
      setActivity(activityResult.activity.slice(0, 10));
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const featuredServices = services.slice(0, 3);
  const catalogServices = services.slice(0, 6);
  const liveCalls = activity.filter(item => item.type === "service.hired").slice(0, 3);

  async function refreshNetwork() {
    const [metricsResult, servicesResult, activityResult] = await Promise.all([
      getJson<{ metrics: Metrics }>("/metrics"),
      getJson<{ services: Service[] }>("/services"),
      getJson<{ activity: Activity[] }>("/activity"),
    ]);
    setMetrics(metricsResult.metrics);
    setServices(servicesResult.services);
    setActivity(activityResult.activity.slice(0, 10));
  }

  async function handleRegisterService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({ status: "submitting", message: "Verifying payment endpoints..." });

    const capabilityTags = formState.capabilityTags
      .split(",")
      .map(tag => tag.trim())
      .filter(Boolean);

    const paymentMethods = [
      ...(formState.supportsX402 ? (["x402"] as const) : []),
      ...(formState.supportsMpp ? (["mpp"] as const) : []),
    ];

    if (paymentMethods.length === 0) {
      setSubmitState({ status: "error", message: "Select at least one payment method." });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/services/register`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: formState.name,
          description: formState.description,
          endpointUrl: formState.endpointUrl,
          priceUsd: Number(formState.priceUsd),
          capabilityTags,
          paymentMethods,
          ownerAddress: formState.ownerAddress,
          stakeUsd: Number(formState.stakeUsd),
          metadata: {
            network: formState.network,
            endpoints: {
              ...(formState.supportsX402 && formState.x402Endpoint ? { x402: formState.x402Endpoint } : {}),
              ...(formState.supportsMpp && formState.mppChargeEndpoint
                ? { mppCharge: formState.mppChargeEndpoint }
                : {}),
              ...(formState.supportsMpp && formState.mppChannelEndpoint
                ? { mppChannel: formState.mppChannelEndpoint }
                : {}),
            },
          },
        }),
      });

      const result = (await response.json()) as { error?: string; service?: Service };

      if (!response.ok) {
        throw new Error(result.error ?? "Registration failed.");
      }

      setSubmitState({
        status: "success",
        message: `${result.service?.name ?? formState.name} verified and listed successfully.`,
      });
      setFormState({
        name: "",
        description: "",
        endpointUrl: "",
        priceUsd: "0.02",
        capabilityTags: "search,data",
        ownerAddress: "",
        network: "stellar:testnet",
        stakeUsd: "0",
        supportsX402: true,
        supportsMpp: false,
        x402Endpoint: "",
        mppChargeEndpoint: "",
        mppChannelEndpoint: "",
      });
      await refreshNetwork();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed.";
      setSubmitState({ status: "error", message });
    }
  }

  function updateForm<K extends keyof typeof formState>(key: K, value: (typeof formState)[K]) {
    setFormState(current => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="shell">
      <header className="site-header">
        <div className="nav">
          <a className="brand" href="#top">
            <span className="brand-mark">StellarMesh</span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#network">Network</a>
            <a href="#services">Services</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#agent-access">Agent Access</a>
          </nav>
          <div className="nav-actions">
            <a className="button button-frosted" href="#dashboard">
              View Live Dashboard
            </a>
            <a className="button button-solid" href={`${apiBaseUrl}/services`}>
              Explore API
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="page">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="micro-label">Autonomous agent service network</p>
            <h1>
              Agents find.
              <br />
              Agents pay.
              <br />
              Agents ship.
            </h1>
            <p className="hero-lede">
              StellarMesh turns Stellar into a live machine-commerce layer where agents discover
              paid services, route settlement through x402 or MPP, and build trust through visible
              network usage.
            </p>
            <div className="hero-actions">
              <a className="button button-solid" href="#agent-access">
                Connect Your Agent
              </a>
              <a className="button button-frosted" href="#services">
                Browse Services
              </a>
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-glow" />
            <section className="product-shot product-shot-primary">
              <div className="shot-toolbar">
                <span />
                <span />
                <span />
              </div>
              <div className="shot-grid">
                <div className="shot-pane shot-pane-left">
                  <p className="pane-label">Discovery</p>
                  <h2>Ranked, priced, and ready for agents.</h2>
                  <div className="mock-service-list">
                    {featuredServices.map(service => (
                      <article key={service.id} className="mock-service-card">
                        <div className="mock-topline">
                          <strong>{service.name}</strong>
                          <span>${service.priceUsd.toFixed(2)}</span>
                        </div>
                        <p>{service.capabilityTags.slice(0, 2).join(" / ")}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="shot-pane shot-pane-right">
                  <p className="pane-label">Routing</p>
                  <div className="route-stack">
                    <RouteCard
                      title="x402"
                      detail="Per-request settlement for first-touch service calls."
                    />
                    <RouteCard
                      title="MPP"
                      detail="Automatic upgrade for repeated sessions and higher throughput."
                    />
                    <RouteCard
                      title="MCP"
                      detail="Agent tools for discovery, hiring, and reputation checks."
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section id="network" className="section">
          <div className="section-heading">
            <p className="micro-label">Why it exists</p>
            <h2>The missing layer between payment rails and autonomous work.</h2>
            <p>
              Stellar already has the money movement primitives. StellarMesh adds discoverability,
              orchestration, trust, and agent-native access so paid services can behave like a real
              open market.
            </p>
          </div>

          <div className="value-grid">
            <ValueCard
              title="Discovery"
              body="Agents search by capability, price, and payment method instead of hardcoding providers."
            />
            <ValueCard
              title="Hybrid Routing"
              body="The network chooses x402 for initial calls and switches to MPP when a session becomes high-frequency."
            />
            <ValueCard
              title="Reputation"
              body="Providers surface trust through settlement history, uptime, and live network volume."
            />
            <ValueCard
              title="Agent Access"
              body="Any MCP-compatible agent can discover, hire, and evaluate services without custom payment plumbing."
            />
          </div>
        </section>

        <section id="services" className="section">
          <div className="section-heading">
            <p className="micro-label">Featured services</p>
            <h2>A live catalog designed for machines, not app stores.</h2>
            <p>
              Providers register specialized endpoints, agents search the catalog, and the network
              handles payment and trust evaluation underneath.
            </p>
          </div>

          <div className="service-showcase">
            {catalogServices.map(service => (
              <article key={service.id} className="service-panel">
                <div className="service-panel-header">
                  <div>
                    <p className="pane-label">{service.id}</p>
                    <h3>{service.name}</h3>
                  </div>
                  <span className="price-pill">${service.priceUsd.toFixed(2)}</span>
                </div>
                <p className="service-description">{service.description}</p>
                <div className="tag-row">
                  {service.capabilityTags.map(tag => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="service-meta">
                  <MetaStat label="Rank" value={service.rankingScore} />
                  <MetaStat label="Reputation" value={service.reputation?.score ?? "n/a"} />
                  <MetaStat label="Methods" value={service.paymentMethods.join(" + ")} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="dashboard" className="section dashboard-section">
          <div className="section-heading">
            <p className="micro-label">Live dashboard</p>
            <h2>The network should look alive the moment someone lands.</h2>
            <p>
              This view is both product and proof: visible settlements, active services, route
              changes, and the health of the service economy in one place.
            </p>
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-panel dashboard-hero-panel">
              <div className="dashboard-hero-copy">
                <p className="pane-label">Network status</p>
                <h3>Real testnet activity flowing through x402 and MPP.</h3>
                <p>
                  Designed for demos, operators, and judges who want immediate confidence that the
                  system is actually moving money and work.
                </p>
              </div>
              <div className="metric-grid">
                <MetricCard label="Active Services" value={metrics?.serviceCount ?? 0} />
                <MetricCard label="USDC Volume" value={`$${metrics?.totalVolumeUsd ?? 0}`} />
                <MetricCard label="Settlements" value={metrics?.totalSettlements ?? 0} />
                <MetricCard label="Avg Reputation" value={metrics?.avgReputation ?? 0} />
              </div>
            </section>

            <section className="dashboard-panel spotlight-panel">
              <div className="panel-header">
                <div>
                  <p className="pane-label">Session routing</p>
                  <h3>How payment mode evolves during agent sessions.</h3>
                </div>
              </div>
              <div className="route-timeline">
                <TimelineStep
                  step="1"
                  title="Discovery request"
                  body="Agent searches by capability and price through the registry API."
                />
                <TimelineStep
                  step="2"
                  title="x402 first touch"
                  body="The first request settles per call so the agent can sample providers safely."
                />
                <TimelineStep
                  step="3"
                  title="MPP session upgrade"
                  body="As repeat calls accumulate, StellarMesh shifts to the cheaper high-frequency path."
                />
              </div>
            </section>

            <section className="dashboard-panel feed-panel">
              <div className="panel-header">
                <div>
                  <p className="pane-label">Recent activity</p>
                  <h3>Discovery, routing, hiring, and settlement.</h3>
                </div>
              </div>
              <ul className="activity-feed">
                {activity.map(item => (
                  <li key={item.id} className="activity-item">
                    <div className="activity-copy">
                      <strong>{item.message}</strong>
                      <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <small>
                      {item.paymentMethod ? item.paymentMethod.toUpperCase() : "NETWORK"}
                      {typeof item.amountUsd === "number" ? ` / $${item.amountUsd.toFixed(2)}` : ""}
                    </small>
                  </li>
                ))}
              </ul>
            </section>

            <section className="dashboard-panel call-panel">
              <div className="panel-header">
                <div>
                  <p className="pane-label">Latest hires</p>
                  <h3>Provider responses arriving from the network.</h3>
                </div>
              </div>
              <div className="call-list">
                {liveCalls.length > 0 ? (
                  liveCalls.map(item => (
                    <article key={item.id} className="call-card">
                      <div className="call-topline">
                        <strong>{item.paymentMethod?.toUpperCase() ?? "NETWORK"}</strong>
                        <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p>{item.message}</p>
                    </article>
                  ))
                ) : (
                  <article className="call-card">
                    <div className="call-topline">
                      <strong>Awaiting live hires</strong>
                      <span>Now</span>
                    </div>
                    <p>Make a paid request and this panel turns into a live session reel.</p>
                  </article>
                )}
              </div>
            </section>
          </div>
        </section>

        <section id="agent-access" className="section agent-section">
          <div className="section-heading">
            <p className="micro-label">Agent access</p>
            <h2>One API for humans, one MCP surface for autonomous clients.</h2>
            <p>
              Developers can integrate directly over HTTP, or plug StellarMesh into Claude, Codex,
              and other MCP-compatible systems as a native tool surface.
            </p>
          </div>

          <div className="agent-grid">
            <article className="agent-panel">
              <p className="pane-label">HTTP</p>
              <h3>Use the marketplace directly.</h3>
              <pre className="code-block">
                <code>{`GET ${apiBaseUrl}/services?capability=web-search
POST ${apiBaseUrl}/hire
GET ${apiBaseUrl}/services/:id`}</code>
              </pre>
            </article>

            <article className="agent-panel">
              <p className="pane-label">MCP</p>
              <h3>Expose StellarMesh as an agent toolset.</h3>
              <pre className="code-block">
                <code>{`discover_service(capability, maxPrice)
hire_service(serviceId, sessionId, taskPayload)
check_reputation(serviceId)`}</code>
              </pre>
            </article>
          </div>
        </section>

        <section id="register" className="section">
          <div className="section-heading">
            <p className="micro-label">Provider onboarding</p>
            <h2>List a service only after the network proves it can really charge.</h2>
            <p>
              Registration now verifies that your endpoint actually returns a valid x402 or MPP
              payment challenge before StellarMesh accepts it into the catalog.
            </p>
          </div>

          <div className="register-layout">
            <form className="register-panel" onSubmit={handleRegisterService}>
              <div className="register-grid">
                <Field label="Service name">
                  <input
                    value={formState.name}
                    onChange={event => updateForm("name", event.target.value)}
                    placeholder="Nova OCR"
                    required
                  />
                </Field>

                <Field label="Owner address">
                  <input
                    value={formState.ownerAddress}
                    onChange={event => updateForm("ownerAddress", event.target.value)}
                    placeholder="G..."
                    required
                  />
                </Field>

                <Field label="Primary endpoint">
                  <input
                    value={formState.endpointUrl}
                    onChange={event => updateForm("endpointUrl", event.target.value)}
                    placeholder="https://provider.example.com/x402/ocr"
                    required
                  />
                </Field>

                <Field label="Price in USDC">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={formState.priceUsd}
                    onChange={event => updateForm("priceUsd", event.target.value)}
                    required
                  />
                </Field>

                <Field label="Capability tags">
                  <input
                    value={formState.capabilityTags}
                    onChange={event => updateForm("capabilityTags", event.target.value)}
                    placeholder="ocr,documents,extraction"
                    required
                  />
                </Field>

                <Field label="Stake">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formState.stakeUsd}
                    onChange={event => updateForm("stakeUsd", event.target.value)}
                  />
                </Field>

                <Field label="Description" className="field-span-2">
                  <textarea
                    value={formState.description}
                    onChange={event => updateForm("description", event.target.value)}
                    placeholder="Paid OCR extraction for PDFs and images."
                    rows={4}
                    required
                  />
                </Field>

                <Field label="Payment methods" className="field-span-2">
                  <div className="toggle-row">
                    <label className="toggle-pill">
                      <input
                        type="checkbox"
                        checked={formState.supportsX402}
                        onChange={event => updateForm("supportsX402", event.target.checked)}
                      />
                      <span>x402</span>
                    </label>
                    <label className="toggle-pill">
                      <input
                        type="checkbox"
                        checked={formState.supportsMpp}
                        onChange={event => updateForm("supportsMpp", event.target.checked)}
                      />
                      <span>MPP</span>
                    </label>
                  </div>
                </Field>

                {formState.supportsX402 ? (
                  <Field label="x402 endpoint" className="field-span-2">
                    <input
                      value={formState.x402Endpoint}
                      onChange={event => updateForm("x402Endpoint", event.target.value)}
                      placeholder="https://provider.example.com/x402/ocr"
                    />
                  </Field>
                ) : null}

                {formState.supportsMpp ? (
                  <>
                    <Field label="MPP charge endpoint">
                      <input
                        value={formState.mppChargeEndpoint}
                        onChange={event => updateForm("mppChargeEndpoint", event.target.value)}
                        placeholder="https://provider.example.com/mpp/charge/ocr"
                      />
                    </Field>
                    <Field label="MPP channel endpoint">
                      <input
                        value={formState.mppChannelEndpoint}
                        onChange={event => updateForm("mppChannelEndpoint", event.target.value)}
                        placeholder="https://provider.example.com/mpp/channel/ocr"
                      />
                    </Field>
                  </>
                ) : null}
              </div>

              <div className="register-actions">
                <button className="button button-solid" type="submit" disabled={submitState.status === "submitting"}>
                  {submitState.status === "submitting" ? "Verifying..." : "Register Service"}
                </button>
                <p
                  className={`submit-message ${
                    submitState.status === "error"
                      ? "submit-message-error"
                      : submitState.status === "success"
                        ? "submit-message-success"
                        : ""
                  }`}
                >
                  {submitState.message || "The API will reject endpoints that are not actually payment protected."}
                </p>
              </div>
            </form>

            <aside className="register-notes">
              <article className="note-card">
                <p className="pane-label">Validation rules</p>
                <h3>No valid payment challenge, no listing.</h3>
                <ul className="note-list">
                  <li>x402 endpoints must return HTTP 402 with a `payment-required` header.</li>
                  <li>MPP charge endpoints must return HTTP 402 with `method="stellar"` and `intent="charge"`.</li>
                  <li>MPP channel endpoints must return HTTP 402 with `method="stellar"` and `intent="channel"`.</li>
                </ul>
              </article>

              <article className="note-card">
                <p className="pane-label">Operator note</p>
                <h3>Registration is now safer for agents.</h3>
                <p>
                  The marketplace verifies payment protection at registration time so discovery does
                  not surface fake, free, or broken services as paid providers.
                </p>
              </article>
            </aside>
          </div>
        </section>
      </main>
    </div>
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

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="value-card">
      <p className="pane-label">Layer</p>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function MetaStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="meta-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TimelineStep({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <article className="timeline-step">
      <span className="timeline-dot">{step}</span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </article>
  );
}

function RouteCard({ title, detail }: { title: string; detail: string }) {
  return (
    <article className="route-card">
      <span>{title}</span>
      <p>{detail}</p>
    </article>
  );
}

function Field(
  { label, className, children }: { label: string; className?: string; children: ReactNode },
) {
  return (
    <label className={`field ${className ?? ""}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}
