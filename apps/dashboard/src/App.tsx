import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

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

// Simple intersection observer hook for scroll-triggered animation
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function App() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<"routing" | "catalog" | "dashboard">("routing");
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
    return () => { active = false; window.clearInterval(timer); };
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

    const capabilityTags = formState.capabilityTags.split(",").map(t => t.trim()).filter(Boolean);
    const paymentMethods = [
      ...(formState.supportsX402 ? (["x402"] as const) : []),
      ...(formState.supportsMpp  ? (["mpp"]  as const) : []),
    ];

    if (paymentMethods.length === 0) {
      setSubmitState({ status: "error", message: "Select at least one payment method." });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/services/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
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
              ...(formState.supportsMpp && formState.mppChargeEndpoint ? { mppCharge: formState.mppChargeEndpoint } : {}),
              ...(formState.supportsMpp && formState.mppChannelEndpoint ? { mppChannel: formState.mppChannelEndpoint } : {}),
            },
          },
        }),
      });

      const result = (await response.json()) as { error?: string; service?: Service };
      if (!response.ok) throw new Error(result.error ?? "Registration failed.");

      setSubmitState({
        status: "success",
        message: `${result.service?.name ?? formState.name} verified and listed successfully.`,
      });
      setFormState({
        name: "", description: "", endpointUrl: "", priceUsd: "0.02",
        capabilityTags: "search,data", ownerAddress: "", network: "stellar:testnet",
        stakeUsd: "0", supportsX402: true, supportsMpp: false,
        x402Endpoint: "", mppChargeEndpoint: "", mppChannelEndpoint: "",
      });
      await refreshNetwork();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed.";
      setSubmitState({ status: "error", message });
    }
  }

  function updateForm<K extends keyof typeof formState>(key: K, value: (typeof formState)[K]) {
    setFormState(current => ({ ...current, [key]: value }));
  }

  // Scroll-in sections
  const networkSection  = useInView();
  const servicesSection = useInView();
  const dashSection     = useInView();
  const agentSection    = useInView();
  const registerSection = useInView();

  return (
    <div className="shell">
      {/* ── Navigation ── */}
      <header className="site-header">
        <div className="nav">
          <a className="brand" href="#top">
            <span className="brand-logo">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="5" stroke="white" strokeWidth="1.5"/>
                <path d="M8 3 L8 13 M3 8 L13 8" stroke="white" strokeWidth="1.5"/>
              </svg>
            </span>
            <span className="brand-mark">StellarMesh</span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#network">Network</a>
            <a href="#services">Services</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#agent-access">Agent Access</a>
            <a href="#register">Register</a>
          </nav>
          <div className="nav-actions">
            <a className="button button-ghost" href="#dashboard">Live Dashboard</a>
            <a className="button button-solid" href={`${apiBaseUrl}/services`}>Explore API</a>
          </div>
        </div>
      </header>

      <main id="top" className="page">

        {/* ── Hero ── */}
        <section className="hero-section">
          <div className="hero-copy">
            <p className="micro-label animate-fade-up animate-delay-1">Autonomous agent service network</p>
            <h1 className="animate-fade-up animate-delay-2">
              Agents find.<br />
              Agents pay.<br />
              Agents ship.
            </h1>
            <p className="hero-lede animate-fade-up animate-delay-3">
              StellarMesh turns Stellar into a live machine-commerce layer where agents discover
              paid services, route settlement through x402 or MPP, and build trust through
              visible network usage.
            </p>
            <div className="hero-actions animate-fade-up animate-delay-4">
              <a className="button button-warm" href="#agent-access">Connect Your Agent →</a>
              <a className="button button-ghost" href="#services">Browse Services</a>
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-glow" />
            <section className="product-shot product-shot-primary">
              <div className="shot-toolbar">
                <span /><span /><span />
              </div>
              <div className="shot-grid">
                <div className="shot-pane">
                  <p className="pane-label">Discovery</p>
                  <h2>Ranked, priced, and ready for agents.</h2>
                  <div className="mock-service-list">
                    {featuredServices.length > 0
                      ? featuredServices.map(service => (
                        <article key={service.id} className="mock-service-card">
                          <div className="mock-topline">
                            <strong>{service.name}</strong>
                            <span className="price-pill">${service.priceUsd.toFixed(2)}</span>
                          </div>
                          <p>{service.capabilityTags.slice(0, 2).join(" / ")}</p>
                        </article>
                      ))
                      : [1,2,3].map(i => (
                        <article key={i} className="mock-service-card" style={{ opacity: 0.5 }}>
                          <div className="mock-topline">
                            <strong style={{ background: "rgba(0,0,0,0.08)", borderRadius: 4, width: 90, height: 14, display: "block" }} />
                            <span style={{ background: "rgba(0,0,0,0.06)", borderRadius: 999, width: 44, height: 14, display: "block" }} />
                          </div>
                        </article>
                      ))
                    }
                  </div>
                </div>
                <div className="shot-pane">
                  <p className="pane-label">Routing</p>
                  <div className="route-stack">
                    <RouteCard title="x402" detail="Per-request settlement for first-touch service calls." />
                    <RouteCard title="MPP"  detail="Automatic upgrade for repeated sessions and higher throughput." />
                    <RouteCard title="MCP"  detail="Agent tools for discovery, hiring, and reputation checks." />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* ── Network / Value ── */}
        <div
          ref={networkSection.ref}
          id="network"
          className="section"
          style={{
            opacity: networkSection.inView ? 1 : 0,
            transform: networkSection.inView ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
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
            {[
              { title: "Discovery",      body: "Agents search by capability, price, and payment method instead of hardcoding providers." },
              { title: "Hybrid Routing", body: "The network chooses x402 for initial calls and switches to MPP when a session becomes high-frequency." },
              { title: "Reputation",     body: "Providers surface trust through settlement history, uptime, and live network volume." },
              { title: "Agent Access",   body: "Any MCP-compatible agent can discover, hire, and evaluate services without custom payment plumbing." },
            ].map((card, i) => (
              <ValueCard
                key={card.title}
                title={card.title}
                body={card.body}
                delay={i * 80}
              />
            ))}
          </div>
        </div>

        {/* ── Services + Dashboard tabs ── */}
        <div
          ref={servicesSection.ref}
          id="services"
          className="section"
          style={{
            opacity: servicesSection.inView ? 1 : 0,
            transform: servicesSection.inView ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div className="section-heading">
            <p className="micro-label">Explore the network</p>
            <h2>Services, routing, and live settlement — all in one place.</h2>
            <p>
              Switch between the service catalog, session routing details, and the live dashboard.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="section-tabs">
            {(["catalog", "routing", "dashboard"] as const).map(tab => (
              <button
                key={tab}
                className={`tab-button ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "catalog"   ? "Service Catalog"    :
                 tab === "routing"   ? "Session Routing"    :
                                      "Live Dashboard"}
              </button>
            ))}
          </div>

          {/* Tab: Catalog */}
          {activeTab === "catalog" && (
            <div
              className="service-showcase"
              style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
            >
              {catalogServices.length > 0
                ? catalogServices.map((service, i) => (
                  <article
                    key={service.id}
                    className="service-panel"
                    style={{ animationDelay: `${i * 60}ms`, animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
                  >
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
                        <span key={tag} className="tag-pill">{tag}</span>
                      ))}
                    </div>
                    <div className="service-meta">
                      <MetaStat label="Rank"       value={service.rankingScore} />
                      <MetaStat label="Reputation" value={service.reputation?.score ?? "n/a"} />
                      <MetaStat label="Methods"    value={service.paymentMethods.join(" + ")} />
                    </div>
                  </article>
                ))
                : <p style={{ color: "var(--muted)", fontSize: 15, gridColumn: "1/-1", padding: "40px 0" }}>
                    No services registered yet.
                  </p>
              }
            </div>
          )}

          {/* Tab: Routing */}
          {activeTab === "routing" && (
            <div
              className="agent-grid"
              style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
            >
              <article className="agent-panel">
                <p className="pane-label">Session flow</p>
                <h3>How payment mode evolves during agent sessions.</h3>
                <div className="route-timeline">
                  {[
                    { step: "1", title: "Discovery request",  body: "Agent searches by capability and price through the registry API." },
                    { step: "2", title: "x402 first touch",   body: "The first request settles per call so the agent can sample providers safely." },
                    { step: "3", title: "MPP session upgrade", body: "As repeat calls accumulate, StellarMesh shifts to the cheaper high-frequency path." },
                  ].map((s, i) => (
                    <TimelineStep key={s.step} step={s.step} title={s.title} body={s.body} delay={i * 80} />
                  ))}
                </div>
              </article>
              <article className="agent-panel">
                <p className="pane-label">Payment methods</p>
                <h3>Two rails, one network.</h3>
                <div className="route-stack">
                  <RouteCard title="x402" detail="Per-request HTTP payment headers. Ideal for sampling unknown providers with zero commitment." />
                  <RouteCard title="MPP"  detail="Micro-payment channels on Stellar. Lower overhead for high-frequency, trusted sessions." />
                  <RouteCard title="MCP"  detail="Model Context Protocol tools expose the full marketplace as a native agent surface." />
                </div>
              </article>
            </div>
          )}

          {/* Tab: Dashboard */}
          {activeTab === "dashboard" && (
            <div
              id="dashboard"
              className="dashboard-grid"
              style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
            >
              <section className="dashboard-panel dashboard-hero-panel">
                <div className="dashboard-hero-copy">
                  <p className="pane-label">
                    <span className="live-dot" />
                    Network status
                  </p>
                  <h3>Real testnet activity flowing through x402 and MPP.</h3>
                  <p>
                    Live metrics, active services, and settlement history — refreshes every 3 seconds.
                  </p>
                </div>
                <div className="metric-grid">
                  <MetricCard label="Active Services" value={metrics?.serviceCount ?? 0} />
                  <MetricCard label="USDC Volume"    value={`$${metrics?.totalVolumeUsd ?? 0}`} />
                  <MetricCard label="Settlements"    value={metrics?.totalSettlements ?? 0} />
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
                  <TimelineStep step="1" title="Discovery request"  body="Agent searches by capability and price through the registry API." />
                  <TimelineStep step="2" title="x402 first touch"   body="The first request settles per call so the agent can sample providers safely." />
                  <TimelineStep step="3" title="MPP session upgrade" body="As repeat calls accumulate, StellarMesh shifts to the cheaper high-frequency path." />
                </div>
              </section>

              <section className="dashboard-panel feed-panel">
                <div className="panel-header">
                  <div>
                    <p className="pane-label">
                      <span className="live-dot" />
                      Recent activity
                    </p>
                    <h3>Discovery, routing, hiring, and settlement.</h3>
                  </div>
                </div>
                <ul className="activity-feed">
                  {activity.length > 0
                    ? activity.map((item, i) => (
                      <li
                        key={item.id}
                        className="activity-item"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="activity-copy">
                          <strong>{item.message}</strong>
                          <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <small>
                          {item.paymentMethod ? item.paymentMethod.toUpperCase() : "NETWORK"}
                          {typeof item.amountUsd === "number" ? ` · $${item.amountUsd.toFixed(2)}` : ""}
                        </small>
                      </li>
                    ))
                    : <li className="activity-item" style={{ color: "var(--muted)", fontSize: 14 }}>
                        Waiting for network activity…
                      </li>
                  }
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
                  {liveCalls.length > 0
                    ? liveCalls.map(item => (
                      <article key={item.id} className="call-card">
                        <div className="call-topline">
                          <strong>{item.paymentMethod?.toUpperCase() ?? "NETWORK"}</strong>
                          <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p>{item.message}</p>
                      </article>
                    ))
                    : (
                      <article className="call-card" style={{ gridColumn: "1/-1" }}>
                        <div className="call-topline">
                          <strong>Awaiting live hires</strong>
                          <span>Now</span>
                        </div>
                        <p>Make a paid request and this panel turns into a live session reel.</p>
                      </article>
                    )
                  }
                </div>
              </section>
            </div>
          )}
        </div>

        {/* ── Agent Access ── */}
        <div
          ref={agentSection.ref}
          id="agent-access"
          className="section"
          style={{
            opacity: agentSection.inView ? 1 : 0,
            transform: agentSection.inView ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
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
                <code>{`GET ${apiBaseUrl}/services?capability=web-search\nPOST ${apiBaseUrl}/hire\nGET ${apiBaseUrl}/services/:id`}</code>
              </pre>
            </article>
            <article className="agent-panel">
              <p className="pane-label">MCP</p>
              <h3>Expose StellarMesh as an agent toolset.</h3>
              <pre className="code-block">
                <code>{`discover_service(capability, maxPrice)\nhire_service(serviceId, sessionId, taskPayload)\ncheck_reputation(serviceId)`}</code>
              </pre>
            </article>
          </div>
        </div>

        {/* ── Register ── */}
        <div
          ref={registerSection.ref}
          id="register"
          className="section"
          style={{
            opacity: registerSection.inView ? 1 : 0,
            transform: registerSection.inView ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div className="section-heading">
            <p className="micro-label">Provider onboarding</p>
            <h2>List a service only after the network proves it can really charge.</h2>
            <p>
              Registration verifies that your endpoint actually returns a valid x402 or MPP
              payment challenge before StellarMesh accepts it into the catalog.
            </p>
          </div>

          <div className="register-layout">
            <form className="register-panel" onSubmit={handleRegisterService}>
              <div className="register-grid">
                <Field label="Service name">
                  <input
                    value={formState.name}
                    onChange={e => updateForm("name", e.target.value)}
                    placeholder="Nova OCR"
                    required
                  />
                </Field>

                <Field label="Owner address">
                  <input
                    value={formState.ownerAddress}
                    onChange={e => updateForm("ownerAddress", e.target.value)}
                    placeholder="G..."
                    required
                  />
                </Field>

                <Field label="Primary endpoint">
                  <input
                    value={formState.endpointUrl}
                    onChange={e => updateForm("endpointUrl", e.target.value)}
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
                    onChange={e => updateForm("priceUsd", e.target.value)}
                    required
                  />
                </Field>

                <Field label="Capability tags">
                  <input
                    value={formState.capabilityTags}
                    onChange={e => updateForm("capabilityTags", e.target.value)}
                    placeholder="ocr,documents,extraction"
                    required
                  />
                </Field>

                <Field label="Stake (USDC)">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formState.stakeUsd}
                    onChange={e => updateForm("stakeUsd", e.target.value)}
                  />
                </Field>

                <Field label="Description" className="field-span-2">
                  <textarea
                    value={formState.description}
                    onChange={e => updateForm("description", e.target.value)}
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
                        onChange={e => updateForm("supportsX402", e.target.checked)}
                      />
                      <span>x402</span>
                    </label>
                    <label className="toggle-pill">
                      <input
                        type="checkbox"
                        checked={formState.supportsMpp}
                        onChange={e => updateForm("supportsMpp", e.target.checked)}
                      />
                      <span>MPP</span>
                    </label>
                  </div>
                </Field>

                {formState.supportsX402 && (
                  <Field label="x402 endpoint" className="field-span-2">
                    <input
                      value={formState.x402Endpoint}
                      onChange={e => updateForm("x402Endpoint", e.target.value)}
                      placeholder="https://provider.example.com/x402/ocr"
                    />
                  </Field>
                )}

                {formState.supportsMpp && (
                  <>
                    <Field label="MPP charge endpoint">
                      <input
                        value={formState.mppChargeEndpoint}
                        onChange={e => updateForm("mppChargeEndpoint", e.target.value)}
                        placeholder="https://provider.example.com/mpp/charge/ocr"
                      />
                    </Field>
                    <Field label="MPP channel endpoint">
                      <input
                        value={formState.mppChannelEndpoint}
                        onChange={e => updateForm("mppChannelEndpoint", e.target.value)}
                        placeholder="https://provider.example.com/mpp/channel/ocr"
                      />
                    </Field>
                  </>
                )}
              </div>

              <div className="register-actions">
                <button
                  className="button button-solid"
                  type="submit"
                  disabled={submitState.status === "submitting"}
                >
                  {submitState.status === "submitting" ? "Verifying…" : "Register Service"}
                </button>
                <p
                  className={`submit-message ${
                    submitState.status === "error"   ? "submit-message-error"   :
                    submitState.status === "success" ? "submit-message-success" : ""
                  }`}
                >
                  {submitState.message || "The API rejects endpoints that are not payment-protected."}
                </p>
              </div>
            </form>

            <aside className="register-notes">
              <article className="note-card">
                <p className="pane-label">Validation rules</p>
                <h3>No valid payment challenge, no listing.</h3>
                <ul className="note-list">
                  <li>x402 endpoints must return HTTP 402 with a <code>payment-required</code> header.</li>
                  <li>MPP charge endpoints must return HTTP 402 with <code>method="stellar"</code> and <code>intent="charge"</code>.</li>
                  <li>MPP channel endpoints must return HTTP 402 with <code>method="stellar"</code> and <code>intent="channel"</code>.</li>
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
        </div>

        <div className="section-divider" />
      </main>
    </div>
  );
}

/* ── Sub-components ── */

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ValueCard({ title, body, delay = 0 }: { title: string; body: string; delay?: number }) {
  return (
    <article
      className="value-card"
      style={{ animationDelay: `${delay}ms`, animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both" }}
    >
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

function TimelineStep({ step, title, body, delay = 0 }: { step: string; title: string; body: string; delay?: number }) {
  return (
    <article
      className="timeline-step"
      style={{ animationDelay: `${delay}ms`, animation: "slideIn 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
    >
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

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`field ${className ?? ""}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}