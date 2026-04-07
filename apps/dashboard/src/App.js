import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
const apiBaseUrl = import.meta.env.VITE_STELLARMESH_API_URL ?? "http://localhost:4000";
async function getJson(pathname) {
    const response = await fetch(`${apiBaseUrl}${pathname}`);
    return (await response.json());
}
// Simple intersection observer hook for scroll-triggered animation
function useInView(threshold = 0.12) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
        } }, { threshold });
        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);
    return { ref, inView };
}
export function App() {
    const [metrics, setMetrics] = useState(null);
    const [services, setServices] = useState([]);
    const [activity, setActivity] = useState([]);
    const [activeTab, setActiveTab] = useState("routing");
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
    const [submitState, setSubmitState] = useState({ status: "idle", message: "" });
    useEffect(() => {
        let active = true;
        async function refresh() {
            const [metricsResult, servicesResult, activityResult] = await Promise.all([
                getJson("/metrics"),
                getJson("/services"),
                getJson("/activity"),
            ]);
            if (!active)
                return;
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
            getJson("/metrics"),
            getJson("/services"),
            getJson("/activity"),
        ]);
        setMetrics(metricsResult.metrics);
        setServices(servicesResult.services);
        setActivity(activityResult.activity.slice(0, 10));
    }
    async function handleRegisterService(event) {
        event.preventDefault();
        setSubmitState({ status: "submitting", message: "Verifying payment endpoints..." });
        const capabilityTags = formState.capabilityTags.split(",").map(t => t.trim()).filter(Boolean);
        const paymentMethods = [
            ...(formState.supportsX402 ? ["x402"] : []),
            ...(formState.supportsMpp ? ["mpp"] : []),
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
            const result = (await response.json());
            if (!response.ok)
                throw new Error(result.error ?? "Registration failed.");
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Registration failed.";
            setSubmitState({ status: "error", message });
        }
    }
    function updateForm(key, value) {
        setFormState(current => ({ ...current, [key]: value }));
    }
    // Scroll-in sections
    const networkSection = useInView();
    const servicesSection = useInView();
    const dashSection = useInView();
    const agentSection = useInView();
    const registerSection = useInView();
    return (_jsxs("div", { className: "shell", children: [_jsx("header", { className: "site-header", children: _jsxs("div", { className: "nav", children: [_jsxs("a", { className: "brand", href: "#top", children: [_jsx("span", { className: "brand-logo", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", children: [_jsx("circle", { cx: "8", cy: "8", r: "5", stroke: "white", strokeWidth: "1.5" }), _jsx("path", { d: "M8 3 L8 13 M3 8 L13 8", stroke: "white", strokeWidth: "1.5" })] }) }), _jsx("span", { className: "brand-mark", children: "StellarMesh" })] }), _jsxs("nav", { className: "nav-links", "aria-label": "Primary", children: [_jsx("a", { href: "#network", children: "Network" }), _jsx("a", { href: "#services", children: "Services" }), _jsx("a", { href: "#dashboard", children: "Dashboard" }), _jsx("a", { href: "#agent-access", children: "Agent Access" }), _jsx("a", { href: "#register", children: "Register" })] }), _jsxs("div", { className: "nav-actions", children: [_jsx("a", { className: "button button-ghost", href: "#dashboard", children: "Live Dashboard" }), _jsx("a", { className: "button button-solid", href: `${apiBaseUrl}/services`, children: "Explore API" })] })] }) }), _jsxs("main", { id: "top", className: "page", children: [_jsxs("section", { className: "hero-section", children: [_jsxs("div", { className: "hero-copy", children: [_jsx("p", { className: "micro-label animate-fade-up animate-delay-1", children: "Autonomous agent service network" }), _jsxs("h1", { className: "animate-fade-up animate-delay-2", children: ["Agents find.", _jsx("br", {}), "Agents pay.", _jsx("br", {}), "Agents ship."] }), _jsx("p", { className: "hero-lede animate-fade-up animate-delay-3", children: "StellarMesh turns Stellar into a live machine-commerce layer where agents discover paid services, route settlement through x402 or MPP, and build trust through visible network usage." }), _jsxs("div", { className: "hero-actions animate-fade-up animate-delay-4", children: [_jsx("a", { className: "button button-warm", href: "#agent-access", children: "Connect Your Agent \u2192" }), _jsx("a", { className: "button button-ghost", href: "#services", children: "Browse Services" })] })] }), _jsxs("div", { className: "hero-preview", children: [_jsx("div", { className: "hero-glow" }), _jsxs("section", { className: "product-shot product-shot-primary", children: [_jsxs("div", { className: "shot-toolbar", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }), _jsxs("div", { className: "shot-grid", children: [_jsxs("div", { className: "shot-pane", children: [_jsx("p", { className: "pane-label", children: "Discovery" }), _jsx("h2", { children: "Ranked, priced, and ready for agents." }), _jsx("div", { className: "mock-service-list", children: featuredServices.length > 0
                                                                    ? featuredServices.map(service => (_jsxs("article", { className: "mock-service-card", children: [_jsxs("div", { className: "mock-topline", children: [_jsx("strong", { children: service.name }), _jsxs("span", { className: "price-pill", children: ["$", service.priceUsd.toFixed(2)] })] }), _jsx("p", { children: service.capabilityTags.slice(0, 2).join(" / ") })] }, service.id)))
                                                                    : [1, 2, 3].map(i => (_jsx("article", { className: "mock-service-card", style: { opacity: 0.5 }, children: _jsxs("div", { className: "mock-topline", children: [_jsx("strong", { style: { background: "rgba(0,0,0,0.08)", borderRadius: 4, width: 90, height: 14, display: "block" } }), _jsx("span", { style: { background: "rgba(0,0,0,0.06)", borderRadius: 999, width: 44, height: 14, display: "block" } })] }) }, i))) })] }), _jsxs("div", { className: "shot-pane", children: [_jsx("p", { className: "pane-label", children: "Routing" }), _jsxs("div", { className: "route-stack", children: [_jsx(RouteCard, { title: "x402", detail: "Per-request settlement for first-touch service calls." }), _jsx(RouteCard, { title: "MPP", detail: "Automatic upgrade for repeated sessions and higher throughput." }), _jsx(RouteCard, { title: "MCP", detail: "Agent tools for discovery, hiring, and reputation checks." })] })] })] })] })] })] }), _jsxs("div", { ref: networkSection.ref, id: "network", className: "section", style: {
                            opacity: networkSection.inView ? 1 : 0,
                            transform: networkSection.inView ? "translateY(0)" : "translateY(28px)",
                            transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
                        }, children: [_jsxs("div", { className: "section-heading", children: [_jsx("p", { className: "micro-label", children: "Why it exists" }), _jsx("h2", { children: "The missing layer between payment rails and autonomous work." }), _jsx("p", { children: "Stellar already has the money movement primitives. StellarMesh adds discoverability, orchestration, trust, and agent-native access so paid services can behave like a real open market." })] }), _jsx("div", { className: "value-grid", children: [
                                    { title: "Discovery", body: "Agents search by capability, price, and payment method instead of hardcoding providers." },
                                    { title: "Hybrid Routing", body: "The network chooses x402 for initial calls and switches to MPP when a session becomes high-frequency." },
                                    { title: "Reputation", body: "Providers surface trust through settlement history, uptime, and live network volume." },
                                    { title: "Agent Access", body: "Any MCP-compatible agent can discover, hire, and evaluate services without custom payment plumbing." },
                                ].map((card, i) => (_jsx(ValueCard, { title: card.title, body: card.body, delay: i * 80 }, card.title))) })] }), _jsxs("div", { ref: servicesSection.ref, id: "services", className: "section", style: {
                            opacity: servicesSection.inView ? 1 : 0,
                            transform: servicesSection.inView ? "translateY(0)" : "translateY(28px)",
                            transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
                        }, children: [_jsxs("div", { className: "section-heading", children: [_jsx("p", { className: "micro-label", children: "Explore the network" }), _jsx("h2", { children: "Services, routing, and live settlement \u2014 all in one place." }), _jsx("p", { children: "Switch between the service catalog, session routing details, and the live dashboard." })] }), _jsx("div", { className: "section-tabs", children: ["catalog", "routing", "dashboard"].map(tab => (_jsx("button", { className: `tab-button ${activeTab === tab ? "active" : ""}`, onClick: () => setActiveTab(tab), children: tab === "catalog" ? "Service Catalog" :
                                        tab === "routing" ? "Session Routing" :
                                            "Live Dashboard" }, tab))) }), activeTab === "catalog" && (_jsx("div", { className: "service-showcase", style: { animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }, children: catalogServices.length > 0
                                    ? catalogServices.map((service, i) => (_jsxs("article", { className: "service-panel", style: { animationDelay: `${i * 60}ms`, animation: "fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both" }, children: [_jsxs("div", { className: "service-panel-header", children: [_jsxs("div", { children: [_jsx("p", { className: "pane-label", children: service.id }), _jsx("h3", { children: service.name })] }), _jsxs("span", { className: "price-pill", children: ["$", service.priceUsd.toFixed(2)] })] }), _jsx("p", { className: "service-description", children: service.description }), _jsx("div", { className: "tag-row", children: service.capabilityTags.map(tag => (_jsx("span", { className: "tag-pill", children: tag }, tag))) }), _jsxs("div", { className: "service-meta", children: [_jsx(MetaStat, { label: "Rank", value: service.rankingScore }), _jsx(MetaStat, { label: "Reputation", value: service.reputation?.score ?? "n/a" }), _jsx(MetaStat, { label: "Methods", value: service.paymentMethods.join(" + ") })] })] }, service.id)))
                                    : _jsx("p", { style: { color: "var(--muted)", fontSize: 15, gridColumn: "1/-1", padding: "40px 0" }, children: "No services registered yet." }) })), activeTab === "routing" && (_jsxs("div", { className: "agent-grid", style: { animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }, children: [_jsxs("article", { className: "agent-panel", children: [_jsx("p", { className: "pane-label", children: "Session flow" }), _jsx("h3", { children: "How payment mode evolves during agent sessions." }), _jsx("div", { className: "route-timeline", children: [
                                                    { step: "1", title: "Discovery request", body: "Agent searches by capability and price through the registry API." },
                                                    { step: "2", title: "x402 first touch", body: "The first request settles per call so the agent can sample providers safely." },
                                                    { step: "3", title: "MPP session upgrade", body: "As repeat calls accumulate, StellarMesh shifts to the cheaper high-frequency path." },
                                                ].map((s, i) => (_jsx(TimelineStep, { step: s.step, title: s.title, body: s.body, delay: i * 80 }, s.step))) })] }), _jsxs("article", { className: "agent-panel", children: [_jsx("p", { className: "pane-label", children: "Payment methods" }), _jsx("h3", { children: "Two rails, one network." }), _jsxs("div", { className: "route-stack", children: [_jsx(RouteCard, { title: "x402", detail: "Per-request HTTP payment headers. Ideal for sampling unknown providers with zero commitment." }), _jsx(RouteCard, { title: "MPP", detail: "Micro-payment channels on Stellar. Lower overhead for high-frequency, trusted sessions." }), _jsx(RouteCard, { title: "MCP", detail: "Model Context Protocol tools expose the full marketplace as a native agent surface." })] })] })] })), activeTab === "dashboard" && (_jsxs("div", { id: "dashboard", className: "dashboard-grid", style: { animation: "fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both" }, children: [_jsxs("section", { className: "dashboard-panel dashboard-hero-panel", children: [_jsxs("div", { className: "dashboard-hero-copy", children: [_jsxs("p", { className: "pane-label", children: [_jsx("span", { className: "live-dot" }), "Network status"] }), _jsx("h3", { children: "Real testnet activity flowing through x402 and MPP." }), _jsx("p", { children: "Live metrics, active services, and settlement history \u2014 refreshes every 3 seconds." })] }), _jsxs("div", { className: "metric-grid", children: [_jsx(MetricCard, { label: "Active Services", value: metrics?.serviceCount ?? 0 }), _jsx(MetricCard, { label: "USDC Volume", value: `$${metrics?.totalVolumeUsd ?? 0}` }), _jsx(MetricCard, { label: "Settlements", value: metrics?.totalSettlements ?? 0 }), _jsx(MetricCard, { label: "Avg Reputation", value: metrics?.avgReputation ?? 0 })] })] }), _jsxs("section", { className: "dashboard-panel spotlight-panel", children: [_jsx("div", { className: "panel-header", children: _jsxs("div", { children: [_jsx("p", { className: "pane-label", children: "Session routing" }), _jsx("h3", { children: "How payment mode evolves during agent sessions." })] }) }), _jsxs("div", { className: "route-timeline", children: [_jsx(TimelineStep, { step: "1", title: "Discovery request", body: "Agent searches by capability and price through the registry API." }), _jsx(TimelineStep, { step: "2", title: "x402 first touch", body: "The first request settles per call so the agent can sample providers safely." }), _jsx(TimelineStep, { step: "3", title: "MPP session upgrade", body: "As repeat calls accumulate, StellarMesh shifts to the cheaper high-frequency path." })] })] }), _jsxs("section", { className: "dashboard-panel feed-panel", children: [_jsx("div", { className: "panel-header", children: _jsxs("div", { children: [_jsxs("p", { className: "pane-label", children: [_jsx("span", { className: "live-dot" }), "Recent activity"] }), _jsx("h3", { children: "Discovery, routing, hiring, and settlement." })] }) }), _jsx("ul", { className: "activity-feed", children: activity.length > 0
                                                    ? activity.map((item, i) => (_jsxs("li", { className: "activity-item", style: { animationDelay: `${i * 40}ms` }, children: [_jsxs("div", { className: "activity-copy", children: [_jsx("strong", { children: item.message }), _jsx("span", { children: new Date(item.createdAt).toLocaleTimeString() })] }), _jsxs("small", { children: [item.paymentMethod ? item.paymentMethod.toUpperCase() : "NETWORK", typeof item.amountUsd === "number" ? ` · $${item.amountUsd.toFixed(2)}` : ""] })] }, item.id)))
                                                    : _jsx("li", { className: "activity-item", style: { color: "var(--muted)", fontSize: 14 }, children: "Waiting for network activity\u2026" }) })] }), _jsxs("section", { className: "dashboard-panel call-panel", children: [_jsx("div", { className: "panel-header", children: _jsxs("div", { children: [_jsx("p", { className: "pane-label", children: "Latest hires" }), _jsx("h3", { children: "Provider responses arriving from the network." })] }) }), _jsx("div", { className: "call-list", children: liveCalls.length > 0
                                                    ? liveCalls.map(item => (_jsxs("article", { className: "call-card", children: [_jsxs("div", { className: "call-topline", children: [_jsx("strong", { children: item.paymentMethod?.toUpperCase() ?? "NETWORK" }), _jsx("span", { children: new Date(item.createdAt).toLocaleTimeString() })] }), _jsx("p", { children: item.message })] }, item.id)))
                                                    : (_jsxs("article", { className: "call-card", style: { gridColumn: "1/-1" }, children: [_jsxs("div", { className: "call-topline", children: [_jsx("strong", { children: "Awaiting live hires" }), _jsx("span", { children: "Now" })] }), _jsx("p", { children: "Make a paid request and this panel turns into a live session reel." })] })) })] })] }))] }), _jsxs("div", { ref: agentSection.ref, id: "agent-access", className: "section", style: {
                            opacity: agentSection.inView ? 1 : 0,
                            transform: agentSection.inView ? "translateY(0)" : "translateY(28px)",
                            transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
                        }, children: [_jsxs("div", { className: "section-heading", children: [_jsx("p", { className: "micro-label", children: "Agent access" }), _jsx("h2", { children: "One API for humans, one MCP surface for autonomous clients." }), _jsx("p", { children: "Developers can integrate directly over HTTP, or plug StellarMesh into Claude, Codex, and other MCP-compatible systems as a native tool surface." })] }), _jsxs("div", { className: "agent-grid", children: [_jsxs("article", { className: "agent-panel", children: [_jsx("p", { className: "pane-label", children: "HTTP" }), _jsx("h3", { children: "Use the marketplace directly." }), _jsx("pre", { className: "code-block", children: _jsx("code", { children: `GET ${apiBaseUrl}/services?capability=web-search\nPOST ${apiBaseUrl}/hire\nGET ${apiBaseUrl}/services/:id` }) })] }), _jsxs("article", { className: "agent-panel", children: [_jsx("p", { className: "pane-label", children: "MCP" }), _jsx("h3", { children: "Expose StellarMesh as an agent toolset." }), _jsx("pre", { className: "code-block", children: _jsx("code", { children: `discover_service(capability, maxPrice)\nhire_service(serviceId, sessionId, taskPayload)\ncheck_reputation(serviceId)` }) })] })] })] }), _jsxs("div", { ref: registerSection.ref, id: "register", className: "section", style: {
                            opacity: registerSection.inView ? 1 : 0,
                            transform: registerSection.inView ? "translateY(0)" : "translateY(28px)",
                            transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
                        }, children: [_jsxs("div", { className: "section-heading", children: [_jsx("p", { className: "micro-label", children: "Provider onboarding" }), _jsx("h2", { children: "List a service only after the network proves it can really charge." }), _jsx("p", { children: "Registration verifies that your endpoint actually returns a valid x402 or MPP payment challenge before StellarMesh accepts it into the catalog." })] }), _jsxs("div", { className: "register-layout", children: [_jsxs("form", { className: "register-panel", onSubmit: handleRegisterService, children: [_jsxs("div", { className: "register-grid", children: [_jsx(Field, { label: "Service name", children: _jsx("input", { value: formState.name, onChange: e => updateForm("name", e.target.value), placeholder: "Nova OCR", required: true }) }), _jsx(Field, { label: "Owner address", children: _jsx("input", { value: formState.ownerAddress, onChange: e => updateForm("ownerAddress", e.target.value), placeholder: "G...", required: true }) }), _jsx(Field, { label: "Primary endpoint", children: _jsx("input", { value: formState.endpointUrl, onChange: e => updateForm("endpointUrl", e.target.value), placeholder: "https://provider.example.com/x402/ocr", required: true }) }), _jsx(Field, { label: "Price in USDC", children: _jsx("input", { type: "number", min: "0.001", step: "0.001", value: formState.priceUsd, onChange: e => updateForm("priceUsd", e.target.value), required: true }) }), _jsx(Field, { label: "Capability tags", children: _jsx("input", { value: formState.capabilityTags, onChange: e => updateForm("capabilityTags", e.target.value), placeholder: "ocr,documents,extraction", required: true }) }), _jsx(Field, { label: "Stake (USDC)", children: _jsx("input", { type: "number", min: "0", step: "0.1", value: formState.stakeUsd, onChange: e => updateForm("stakeUsd", e.target.value) }) }), _jsx(Field, { label: "Description", className: "field-span-2", children: _jsx("textarea", { value: formState.description, onChange: e => updateForm("description", e.target.value), placeholder: "Paid OCR extraction for PDFs and images.", rows: 4, required: true }) }), _jsx(Field, { label: "Payment methods", className: "field-span-2", children: _jsxs("div", { className: "toggle-row", children: [_jsxs("label", { className: "toggle-pill", children: [_jsx("input", { type: "checkbox", checked: formState.supportsX402, onChange: e => updateForm("supportsX402", e.target.checked) }), _jsx("span", { children: "x402" })] }), _jsxs("label", { className: "toggle-pill", children: [_jsx("input", { type: "checkbox", checked: formState.supportsMpp, onChange: e => updateForm("supportsMpp", e.target.checked) }), _jsx("span", { children: "MPP" })] })] }) }), formState.supportsX402 && (_jsx(Field, { label: "x402 endpoint", className: "field-span-2", children: _jsx("input", { value: formState.x402Endpoint, onChange: e => updateForm("x402Endpoint", e.target.value), placeholder: "https://provider.example.com/x402/ocr" }) })), formState.supportsMpp && (_jsxs(_Fragment, { children: [_jsx(Field, { label: "MPP charge endpoint", children: _jsx("input", { value: formState.mppChargeEndpoint, onChange: e => updateForm("mppChargeEndpoint", e.target.value), placeholder: "https://provider.example.com/mpp/charge/ocr" }) }), _jsx(Field, { label: "MPP channel endpoint", children: _jsx("input", { value: formState.mppChannelEndpoint, onChange: e => updateForm("mppChannelEndpoint", e.target.value), placeholder: "https://provider.example.com/mpp/channel/ocr" }) })] }))] }), _jsxs("div", { className: "register-actions", children: [_jsx("button", { className: "button button-solid", type: "submit", disabled: submitState.status === "submitting", children: submitState.status === "submitting" ? "Verifying…" : "Register Service" }), _jsx("p", { className: `submit-message ${submitState.status === "error" ? "submit-message-error" :
                                                            submitState.status === "success" ? "submit-message-success" : ""}`, children: submitState.message || "The API rejects endpoints that are not payment-protected." })] })] }), _jsxs("aside", { className: "register-notes", children: [_jsxs("article", { className: "note-card", children: [_jsx("p", { className: "pane-label", children: "Validation rules" }), _jsx("h3", { children: "No valid payment challenge, no listing." }), _jsxs("ul", { className: "note-list", children: [_jsxs("li", { children: ["x402 endpoints must return HTTP 402 with a ", _jsx("code", { children: "payment-required" }), " header."] }), _jsxs("li", { children: ["MPP charge endpoints must return HTTP 402 with ", _jsx("code", { children: "method=\"stellar\"" }), " and ", _jsx("code", { children: "intent=\"charge\"" }), "."] }), _jsxs("li", { children: ["MPP channel endpoints must return HTTP 402 with ", _jsx("code", { children: "method=\"stellar\"" }), " and ", _jsx("code", { children: "intent=\"channel\"" }), "."] })] })] }), _jsxs("article", { className: "note-card", children: [_jsx("p", { className: "pane-label", children: "Operator note" }), _jsx("h3", { children: "Registration is now safer for agents." }), _jsx("p", { children: "The marketplace verifies payment protection at registration time so discovery does not surface fake, free, or broken services as paid providers." })] })] })] })] }), _jsx("div", { className: "section-divider" })] })] }));
}
/* ── Sub-components ── */
function MetricCard({ label, value }) {
    return (_jsxs("article", { className: "metric-card", children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }));
}
function ValueCard({ title, body, delay = 0 }) {
    return (_jsxs("article", { className: "value-card", style: { animationDelay: `${delay}ms`, animation: "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both" }, children: [_jsx("p", { className: "pane-label", children: "Layer" }), _jsx("h3", { children: title }), _jsx("p", { children: body })] }));
}
function MetaStat({ label, value }) {
    return (_jsxs("div", { className: "meta-stat", children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }));
}
function TimelineStep({ step, title, body, delay = 0 }) {
    return (_jsxs("article", { className: "timeline-step", style: { animationDelay: `${delay}ms`, animation: "slideIn 0.4s cubic-bezier(0.22,1,0.36,1) both" }, children: [_jsx("span", { className: "timeline-dot", children: step }), _jsxs("div", { children: [_jsx("strong", { children: title }), _jsx("p", { children: body })] })] }));
}
function RouteCard({ title, detail }) {
    return (_jsxs("article", { className: "route-card", children: [_jsx("span", { children: title }), _jsx("p", { children: detail })] }));
}
function Field({ label, className, children }) {
    return (_jsxs("label", { className: `field ${className ?? ""}`.trim(), children: [_jsx("span", { children: label }), children] }));
}
