import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type Metrics = { serviceCount: number; totalVolumeUsd: number; totalSettlements: number; avgReputation: number };
type Service = {
  id: string; name: string; description: string; endpointUrl: string; priceUsd: number;
  capabilityTags: string[]; rankingScore: number; paymentMethods: Array<"x402" | "mpp">;
  reputation: { score: number; successfulSettlements: number; totalVolumeUsd: number } | null;
};
type Activity = { id: string; message: string; createdAt: string; paymentMethod?: string; amountUsd?: number; status?: string; type?: string };

const apiBaseUrl = import.meta.env.VITE_STELLARMESH_API_URL ?? "http://localhost:4000";
const skillDownloadUrl = "/skills/stellarmesh-agent-skill.md";

async function getJson<T>(pathname: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${pathname}`);
  return (await response.json()) as T;
}

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function App() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<"catalog" | "routing" | "dashboard">("catalog");
  const [agentTab, setAgentTab] = useState<"overview" | "skill" | "api">("overview");
  const [registerTab, setRegisterTab] = useState<"overview" | "requirements" | "form">("overview");
  const [formState, setFormState] = useState({
    name: "", description: "", endpointUrl: "", priceUsd: "0.02", capabilityTags: "search,data",
    ownerAddress: "", network: "stellar:testnet", stakeUsd: "0", supportsX402: true, supportsMpp: false,
    x402Endpoint: "", mppChargeEndpoint: "", mppChannelEndpoint: "",
  });
  const [submitState, setSubmitState] = useState<{ status: "idle" | "submitting" | "success" | "error"; message: string }>({
    status: "idle",
    message: "",
  });

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
  const liveCalls = activity.filter(item => item.type === "service.hired").slice(0, 3);
  const liveCapabilities = Array.from(new Set(services.flatMap(service => service.capabilityTags))).slice(0, 12);
  const futureCapabilities = ["scraping", "browser-automation", "ocr", "embeddings", "financial-data", "translation", "code-execution", "monitoring"];

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
    const capabilityTags = formState.capabilityTags.split(",").map(tag => tag.trim()).filter(Boolean);
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
      setSubmitState({ status: "success", message: `${result.service?.name ?? formState.name} verified and listed successfully.` });
      setFormState({
        name: "", description: "", endpointUrl: "", priceUsd: "0.02", capabilityTags: "search,data",
        ownerAddress: "", network: "stellar:testnet", stakeUsd: "0", supportsX402: true, supportsMpp: false,
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

  const networkSection = useInView();
  const servicesSection = useInView();
  const agentSection = useInView();
  const registerSection = useInView();

  return (
    <div className="shell">
      <header className="site-header">
        <div className="nav">
          <a className="brand" href="#top">
            <span className="brand-logo">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="5" stroke="white" strokeWidth="1.5" />
                <path d="M8 3 L8 13 M3 8 L13 8" stroke="white" strokeWidth="1.5" />
              </svg>
            </span>
            <span className="brand-mark">StellarMesh</span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#network">Network</a>
            <a href="#services">Discovery</a>
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
        <section className="hero-section">
          <div className="hero-copy">
            <p className="micro-label animate-fade-up animate-delay-1">Autonomous agent service network</p>
            <h1 className="animate-fade-up animate-delay-2">Agents discover.<br />Agents pay.<br />Services deliver.</h1>
            <p className="hero-lede animate-fade-up animate-delay-3">
              StellarMesh is a discovery layer for paid agent services on Stellar. Humans can browse
              a live marketplace, providers can join with verified x402 or MPP endpoints, and agents
              can discover, compare, and access services using their own wallets.
            </p>
            <div className="hero-actions animate-fade-up animate-delay-4">
              <a className="button button-warm" href="#agent-access">Connect Your Agent</a>
              <a className="button button-ghost" href="#services">Browse Discovery</a>
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-glow" />
            <section className="product-shot product-shot-primary">
              <div className="shot-toolbar"><span /><span /><span /></div>
              <div className="shot-grid">
                <div className="shot-pane">
                  <p className="pane-label">Live network</p>
                  <h2>Paid services, ranked and ready for both humans and agents.</h2>
                  <div className="mock-service-list">
                    {featuredServices.map(service => (
                      <article key={service.id} className="mock-service-card">
                        <div className="mock-topline">
                          <strong>{service.name}</strong>
                          <span className="price-pill">${service.priceUsd.toFixed(2)}</span>
                        </div>
                        <p>{service.capabilityTags.slice(0, 2).join(" / ")}</p>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="shot-pane">
                  <p className="pane-label">Network roles</p>
                  <div className="route-stack">
                    <RouteCard title="Discovery" detail="Search by capability, price, and trust signals." />
                    <RouteCard title="Payments" detail="Providers expose x402 or MPP endpoints that agents pay directly." />
                    <RouteCard title="Agents" detail="Expose the network over HTTP and MCP." />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>

        <div ref={networkSection.ref} id="network" className="section" style={{ opacity: networkSection.inView ? 1 : 0, transform: networkSection.inView ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
          <div className="section-heading">
            <p className="micro-label">The network</p>
            <h2>The service layer for agent commerce on Stellar.</h2>
            <p>
              StellarMesh gives agents and humans one place to discover paid services, evaluate trust,
              and access provider endpoints over Stellar-native payment rails. Providers can join the network, list
              new capabilities, and become instantly available through the same shared interface.
            </p>
          </div>
          <div className="value-grid">
            <ValueCard title="For humans" body="A discovery surface for browsing live paid services and understanding what the network can do." delay={0} />
            <ValueCard title="For providers" body="A registration and verification flow that makes joining the network feel operational, not manual." delay={80} />
            <ValueCard title="For agents" body="A capability layer for discovery, selection, hiring, and trust evaluation through one interface." delay={160} />
            <ValueCard title="For the ecosystem" body="A system that can expand to new categories without changing the market model." delay={240} />
          </div>
        </div>

        <div ref={servicesSection.ref} id="services" className="section" style={{ opacity: servicesSection.inView ? 1 : 0, transform: servicesSection.inView ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
          <div className="section-heading">
            <p className="micro-label">Marketplace</p>
            <h2>Browse the live StellarMesh marketplace.</h2>
            <p>Explore active services, understand how agents reach them, and watch the network update in real time.</p>
          </div>
          <div className="section-tabs">
            {(["catalog", "routing", "dashboard"] as const).map(tab => (
              <button key={tab} className={`tab-button ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                {tab === "catalog" ? "Service Catalog" : tab === "routing" ? "Payment Flows" : "Live Activity"}
              </button>
            ))}
          </div>

          {activeTab === "catalog" ? (
            <div style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <div className="catalog-topline">
                <article className="catalog-summary">
                  <p className="pane-label">Live capabilities</p>
                  <h3>Capabilities already available on the network.</h3>
                  <div className="tag-row">{liveCapabilities.map(tag => <span key={tag} className="tag-pill">{tag}</span>)}</div>
                </article>
                <article className="catalog-summary">
                  <p className="pane-label">Open categories</p>
                  <h3>Service types providers can add next.</h3>
                  <div className="tag-row">{futureCapabilities.map(tag => <span key={tag} className="tag-pill tag-pill-muted">{tag}</span>)}</div>
                </article>
              </div>
              <div className="service-showcase">
                {services.map((service, index) => (
                  <article key={service.id} className="service-panel" style={{ animationDelay: `${index * 60}ms`, animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
                    <div className="service-panel-header">
                      <div><p className="pane-label">{service.id}</p><h3>{service.name}</h3></div>
                      <span className="price-pill">${service.priceUsd.toFixed(2)}</span>
                    </div>
                    <p className="service-description">{service.description}</p>
                    <div className="tag-row">{service.capabilityTags.map(tag => <span key={tag} className="tag-pill">{tag}</span>)}</div>
                    <div className="service-meta">
                      <MetaStat label="Rank" value={service.rankingScore} />
                      <MetaStat label="Reputation" value={service.reputation?.score ?? "n/a"} />
                      <MetaStat label="Methods" value={service.paymentMethods.join(" + ")} />
                    </div>
                    <div className="service-endpoint">
                      <span>Endpoint</span>
                      <a href={service.endpointUrl} target="_blank" rel="noreferrer">{new URL(service.endpointUrl).host}</a>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "routing" ? (
            <div className="agent-grid" style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <article className="agent-panel">
                <p className="pane-label">Routing model</p>
                <h3>How agents access providers after discovery.</h3>
                <div className="route-timeline">
                  <TimelineStep step="1" title="Discover" body="Search by capability, price, and payment support." />
                  <TimelineStep step="2" title="Choose a path" body="Use x402 for one-off access or MPP when the provider supports repeated workflows." />
                  <TimelineStep step="3" title="Pay from the agent wallet" body="The agent calls the provider directly and completes payment from its own wallet." />
                </div>
              </article>
              <article className="agent-panel">
                <p className="pane-label">Why it matters</p>
                <h3>StellarMesh is the discovery layer, not the wallet custodian.</h3>
                <div className="route-stack">
                  <RouteCard title="x402" detail="Best for one-off requests where an agent pays per call." />
                  <RouteCard title="MPP Charge" detail="Useful when a provider supports repeated paid access without a persistent channel." />
                  <RouteCard title="MPP Channel" detail="Useful for longer-running agent-to-service relationships." />
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === "dashboard" ? (
            <div id="dashboard" className="dashboard-grid" style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <section className="dashboard-panel dashboard-hero-panel">
                <div className="dashboard-hero-copy">
                  <p className="pane-label"><span className="live-dot" />Network status</p>
                  <h3>Live metrics from the open service network.</h3>
                  <p>Monitor active services, historical settlements, and reputation signals from one place.</p>
                </div>
                <div className="metric-grid">
                  <MetricCard label="Active Services" value={metrics?.serviceCount ?? 0} />
                  <MetricCard label="USDC Volume" value={`$${metrics?.totalVolumeUsd ?? 0}`} />
                  <MetricCard label="Settlements" value={metrics?.totalSettlements ?? 0} />
                  <MetricCard label="Avg Reputation" value={metrics?.avgReputation ?? 0} />
                </div>
              </section>
              <section className="dashboard-panel spotlight-panel">
                <div className="panel-header"><div><p className="pane-label">Payment access</p><h3>How agents move from discovery to direct provider access.</h3></div></div>
                <div className="route-timeline">
                  <TimelineStep step="1" title="Inspect the service" body="Read metadata, endpoints, and reputation." />
                  <TimelineStep step="2" title="Use the right endpoint" body="Pick x402, MPP charge, or MPP channel based on the workflow." />
                  <TimelineStep step="3" title="Pay directly" body="The agent's own wallet completes the request against the provider." />
                </div>
              </section>
              <section className="dashboard-panel feed-panel">
                <div className="panel-header"><div><p className="pane-label"><span className="live-dot" />Recent activity</p><h3>New registrations, paid calls, and settlement updates.</h3></div></div>
                <ul className="activity-feed">
                  {activity.map((item, index) => (
                    <li key={item.id} className="activity-item" style={{ animationDelay: `${index * 40}ms` }}>
                      <div className="activity-copy"><strong>{item.message}</strong><span>{new Date(item.createdAt).toLocaleTimeString()}</span></div>
                      <small>{item.paymentMethod ? item.paymentMethod.toUpperCase() : "NETWORK"}{typeof item.amountUsd === "number" ? ` / $${item.amountUsd.toFixed(2)}` : ""}</small>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="dashboard-panel call-panel">
                <div className="panel-header"><div><p className="pane-label">Historical settlements</p><h3>Recent paid executions recorded in the network.</h3></div></div>
                <div className="call-list">
                  {liveCalls.length > 0 ? liveCalls.map(item => (
                    <article key={item.id} className="call-card">
                      <div className="call-topline"><strong>{item.paymentMethod?.toUpperCase() ?? "NETWORK"}</strong><span>{new Date(item.createdAt).toLocaleTimeString()}</span></div>
                      <p>{item.message}</p>
                    </article>
                  )) : (
                    <article className="call-card" style={{ gridColumn: "1/-1" }}>
                      <div className="call-topline"><strong>Awaiting live hires</strong><span>Now</span></div>
                      <p>As providers are accessed and rated, this panel becomes a live network activity reel.</p>
                    </article>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <div ref={agentSection.ref} id="agent-access" className="section" style={{ opacity: agentSection.inView ? 1 : 0, transform: agentSection.inView ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
          <div className="section-heading">
            <p className="micro-label">For agents</p>
            <h2>Connect any agent to StellarMesh in a way it can actually use.</h2>
            <p>Give the agent a clear operating model, a reusable skill file, and direct access over API or MCP so it can discover, browse, and access services while paying from its own wallet.</p>
          </div>
          <div className="section-tabs">
            {(["overview", "skill", "api"] as const).map(tab => (
              <button key={tab} className={`tab-button ${agentTab === tab ? "active" : ""}`} onClick={() => setAgentTab(tab)}>
                {tab === "overview" ? "Getting Started" : tab === "skill" ? "Skill File" : "API & MCP"}
              </button>
            ))}
          </div>
          {agentTab === "overview" ? (
            <div className="agent-grid" style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <article className="agent-panel">
                <p className="pane-label">Setup steps</p>
                <h3>How to make an agent network-aware.</h3>
                <ol className="step-list">
                  <li>Point the agent or tool host at `https://stellarmeshapi.onrender.com`.</li>
                  <li>Instruct the agent to search the marketplace before choosing a provider.</li>
                  <li>Use `access_service` or `GET /services/:id/access` to get the right provider endpoint.</li>
                  <li>Let the agent complete x402 or MPP payment from its own wallet.</li>
                </ol>
              </article>
              <article className="agent-panel">
                <p className="pane-label">Capabilities</p>
                <h3>What an attached agent can do.</h3>
                <div className="capability-list">
                  <CapabilityRow title="Discover services" body="Search by capability, budget, and payment support." />
                  <CapabilityRow title="Access providers" body="Get the right provider endpoint and payment path without hardcoding vendors." />
                  <CapabilityRow title="Evaluate trust" body="Read ranking, reputation, and recent network activity." />
                  <CapabilityRow title="Register services" body="List the agent's own paid capability when it exposes a compliant endpoint." />
                </div>
              </article>
            </div>
          ) : null}
          {agentTab === "skill" ? (
            <div className="agent-grid" style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <article className="agent-panel">
                <p className="pane-label">Skill file</p>
                <h3>Give the agent a ready-made StellarMesh operating guide.</h3>
                <p className="agent-note">
                  The StellarMesh skill file teaches an agent how to discover services, compare options,
                  retrieve access instructions, and register its own service into the network.
                </p>
                <div className="hero-actions">
                  <a className="button button-solid" href={skillDownloadUrl} download>Download Skill File</a>
                  <a className="button button-ghost" href={skillDownloadUrl} target="_blank" rel="noreferrer">Preview Markdown</a>
                </div>
                <pre className="code-block"><code>{`.codex/skills/stellarmesh-agent/SKILL.md
/skills/stellarmesh-agent-skill.md`}</code></pre>
              </article>
              <article className="agent-panel">
                <p className="pane-label">How to use it</p>
                <h3>Attach the file, then let the agent use the network.</h3>
                <ol className="step-list">
                  <li>Download the Markdown file from this page.</li>
                  <li>Add it to your agent's project instructions or skills directory.</li>
                  <li>Tell the agent to use the StellarMesh skill whenever it needs external paid capabilities.</li>
                  <li>Let the agent discover first, then access providers through API or MCP.</li>
                </ol>
              </article>
            </div>
          ) : null}
          {agentTab === "api" ? (
            <div className="agent-grid" style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <article className="agent-panel">
                <p className="pane-label">HTTP</p>
                <h3>Use the marketplace directly.</h3>
                <pre className="code-block"><code>{`GET ${apiBaseUrl}/services?capability=web-search
GET ${apiBaseUrl}/services/:id
GET ${apiBaseUrl}/services/:id/access`}</code></pre>
              </article>
              <article className="agent-panel">
                <p className="pane-label">MCP</p>
                <h3>Expose StellarMesh as a native tool layer.</h3>
                <pre className="code-block"><code>{`discover_service(capability, maxPrice)
browse_service(serviceId)
access_service(serviceId, usage)
check_reputation(serviceId)`}</code></pre>
                <p className="agent-note">Point the MCP server at the deployed API, then instruct the agent to browse StellarMesh before selecting a provider.</p>
              </article>
            </div>
          ) : null}
        </div>

        <div ref={registerSection.ref} id="register" className="section" style={{ opacity: registerSection.inView ? 1 : 0, transform: registerSection.inView ? "translateY(0)" : "translateY(28px)", transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}>
          <div className="section-heading">
            <p className="micro-label">For providers</p>
            <h2>List your service on StellarMesh with clear, verifiable steps.</h2>
            <p>Providers should be able to understand the integration requirements, verify compliance, and publish a new service into the network without guessing how the protocol works.</p>
          </div>
          <div className="section-tabs">
            {(["overview", "requirements", "form"] as const).map(tab => (
              <button key={tab} className={`tab-button ${registerTab === tab ? "active" : ""}`} onClick={() => setRegisterTab(tab)}>
                {tab === "overview" ? "How Listing Works" : tab === "requirements" ? "Integration Requirements" : "Register Service"}
              </button>
            ))}
          </div>
          {registerTab === "overview" ? (
            <div className="register-layout" style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <article className="register-panel register-summary-panel">
                <p className="pane-label">Listing flow</p>
                <h3>From service endpoint to live marketplace listing.</h3>
                <ol className="step-list">
                  <li>Deploy a paid service with stable JSON inputs and outputs.</li>
                  <li>Protect the endpoint with x402, MPP, or both using the default Stellar facilitator or your own instance.</li>
                  <li>Submit the service metadata to StellarMesh.</li>
                  <li>Pass the payment challenge checks and become discoverable to agents and humans.</li>
                </ol>
              </article>
              <aside className="register-notes">
                <article className="note-card">
                  <p className="pane-label">What providers publish</p>
                  <h3>Each listing becomes part of the shared network catalog.</h3>
                  <ul className="note-list">
                    <li>Service name, description, price, and capability tags.</li>
                    <li>Supported payment methods and callable endpoints.</li>
                    <li>Provider ownership details and network metadata.</li>
                    <li>Live reputation and activity once the service starts being accessed and rated.</li>
                  </ul>
                </article>
              </aside>
            </div>
          ) : null}
          {registerTab === "requirements" ? (
            <div className="register-layout" style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <article className="register-panel register-summary-panel">
                <p className="pane-label">Protocol checks</p>
                <h3>Your service must pass verification before it can be listed.</h3>
                <ul className="note-list note-list-plain">
                  <li>x402 endpoints must return HTTP 402 with a <code>payment-required</code> header.</li>
                  <li>MPP charge endpoints must return HTTP 402 with <code>method="stellar"</code> and <code>intent="charge"</code>.</li>
                  <li>MPP channel endpoints must return HTTP 402 with <code>method="stellar"</code> and <code>intent="channel"</code>.</li>
                  <li>Services should accept JSON input and return stable JSON output.</li>
                </ul>
              </article>
              <aside className="register-notes">
                <article className="note-card">
                  <p className="pane-label">Implementation guide</p>
                  <h3>What to implement in your own service.</h3>
                  <pre className="code-block"><code>{`POST /x402/your-capability
POST /mpp/charge/your-capability
POST /mpp/channel/your-capability`}</code></pre>
                  <p>Publish at least one paid route, then register the service with the matching payment methods and provider endpoints.</p>
                </article>
              </aside>
            </div>
          ) : null}
          {registerTab === "form" ? (
            <div className="register-layout" style={{ animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
              <form className="register-panel" onSubmit={handleRegisterService}>
                <div className="register-grid">
                  <Field label="Service name"><input value={formState.name} onChange={event => updateForm("name", event.target.value)} placeholder="Nova OCR" required /></Field>
                  <Field label="Owner address"><input value={formState.ownerAddress} onChange={event => updateForm("ownerAddress", event.target.value)} placeholder="G..." required /></Field>
                  <Field label="Primary endpoint"><input value={formState.endpointUrl} onChange={event => updateForm("endpointUrl", event.target.value)} placeholder="https://provider.example.com/x402/ocr" required /></Field>
                  <Field label="Price in USDC"><input type="number" min="0.001" step="0.001" value={formState.priceUsd} onChange={event => updateForm("priceUsd", event.target.value)} required /></Field>
                  <Field label="Capability tags"><input value={formState.capabilityTags} onChange={event => updateForm("capabilityTags", event.target.value)} placeholder="ocr,documents,extraction" required /></Field>
                  <Field label="Stake in USDC"><input type="number" min="0" step="0.1" value={formState.stakeUsd} onChange={event => updateForm("stakeUsd", event.target.value)} /></Field>
                  <Field label="Description" className="field-span-2"><textarea value={formState.description} onChange={event => updateForm("description", event.target.value)} placeholder="Paid OCR extraction for PDFs and images." rows={4} required /></Field>
                  <Field label="Payment methods" className="field-span-2">
                    <div className="toggle-row">
                      <label className="toggle-pill"><input type="checkbox" checked={formState.supportsX402} onChange={event => updateForm("supportsX402", event.target.checked)} /><span>x402</span></label>
                      <label className="toggle-pill"><input type="checkbox" checked={formState.supportsMpp} onChange={event => updateForm("supportsMpp", event.target.checked)} /><span>MPP</span></label>
                    </div>
                  </Field>
                  {formState.supportsX402 ? <Field label="x402 endpoint" className="field-span-2"><input value={formState.x402Endpoint} onChange={event => updateForm("x402Endpoint", event.target.value)} placeholder="https://provider.example.com/x402/ocr" /></Field> : null}
                  {formState.supportsMpp ? (
                    <>
                      <Field label="MPP charge endpoint"><input value={formState.mppChargeEndpoint} onChange={event => updateForm("mppChargeEndpoint", event.target.value)} placeholder="https://provider.example.com/mpp/charge/ocr" /></Field>
                      <Field label="MPP channel endpoint"><input value={formState.mppChannelEndpoint} onChange={event => updateForm("mppChannelEndpoint", event.target.value)} placeholder="https://provider.example.com/mpp/channel/ocr" /></Field>
                    </>
                  ) : null}
                </div>
                <div className="register-actions">
                  <button className="button button-solid" type="submit" disabled={submitState.status === "submitting"}>{submitState.status === "submitting" ? "Verifying..." : "Register Service"}</button>
                  <p className={`submit-message ${submitState.status === "error" ? "submit-message-error" : submitState.status === "success" ? "submit-message-success" : ""}`}>
                    {submitState.message || "Listings are only accepted when the service exposes a valid payment challenge."}
                  </p>
                </div>
              </form>
              <aside className="register-notes">
                <article className="note-card">
                  <p className="pane-label">What happens next</p>
                  <h3>Approved services become discoverable across the network.</h3>
                  <ul className="note-list">
                    <li>Your service is added to the marketplace catalog.</li>
                    <li>Agents can discover it by capability and price.</li>
                    <li>Agent access and rating events start feeding activity and reputation signals.</li>
                  </ul>
                </article>
              </aside>
            </div>
          ) : null}
        </div>

        <div className="section-divider" />
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong></article>;
}

function ValueCard({ title, body, delay = 0 }: { title: string; body: string; delay?: number }) {
  return (
    <article className="value-card" style={{ animationDelay: `${delay}ms`, animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both" }}>
      <p className="pane-label">Layer</p><h3>{title}</h3><p>{body}</p>
    </article>
  );
}

function MetaStat({ label, value }: { label: string; value: string | number }) {
  return <div className="meta-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function TimelineStep({ step, title, body, delay = 0 }: { step: string; title: string; body: string; delay?: number }) {
  return (
    <article className="timeline-step" style={{ animationDelay: `${delay}ms`, animation: "slideIn 0.4s cubic-bezier(0.22,1,0.36,1) both" }}>
      <span className="timeline-dot">{step}</span><div><strong>{title}</strong><p>{body}</p></div>
    </article>
  );
}

function RouteCard({ title, detail }: { title: string; detail: string }) {
  return <article className="route-card"><span>{title}</span><p>{detail}</p></article>;
}

function CapabilityRow({ title, body }: { title: string; body: string }) {
  return <article className="capability-row"><strong>{title}</strong><p>{body}</p></article>;
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={`field ${className ?? ""}`.trim()}><span>{label}</span>{children}</label>;
}
