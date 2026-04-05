import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const apiBaseUrl = import.meta.env.VITE_STELLARMESH_API_URL ?? "http://localhost:4000";
async function getJson(pathname) {
    const response = await fetch(`${apiBaseUrl}${pathname}`);
    return (await response.json());
}
export function App() {
    const [metrics, setMetrics] = useState(null);
    const [services, setServices] = useState([]);
    const [activity, setActivity] = useState([]);
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
            setActivity(activityResult.activity.slice(0, 8));
        }
        void refresh();
        const timer = window.setInterval(() => void refresh(), 3000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);
    return (_jsxs("main", { className: "page", children: [_jsxs("section", { className: "hero", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "StellarMesh" }), _jsx("h1", { children: "Autonomous Agent Service Network" }), _jsx("p", { className: "lede", children: "Agents discover paid services, route settlement through x402 or MPP, and build trust from live usage." })] }), _jsxs("div", { className: "highlight", children: [_jsx("span", { children: "Live Stack" }), _jsx("strong", { children: "x402 + MPP + MCP + Soroban-ready registry" })] })] }), _jsxs("section", { className: "metrics", children: [_jsx(MetricCard, { label: "Active Services", value: metrics?.serviceCount ?? 0 }), _jsx(MetricCard, { label: "USDC Volume", value: `$${metrics?.totalVolumeUsd ?? 0}` }), _jsx(MetricCard, { label: "Settlements", value: metrics?.totalSettlements ?? 0 }), _jsx(MetricCard, { label: "Avg Reputation", value: metrics?.avgReputation ?? 0 })] }), _jsxs("section", { className: "grid", children: [_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: "Service Catalog" }), _jsx("p", { children: "Ranked by capability fit, price, and reputation." })] }), _jsx("div", { className: "service-list", children: services.map(service => (_jsxs("article", { className: "service-card", children: [_jsxs("div", { className: "service-topline", children: [_jsx("h3", { children: service.name }), _jsxs("span", { children: ["$", service.priceUsd.toFixed(2)] })] }), _jsx("p", { children: service.description }), _jsx("div", { className: "tags", children: service.capabilityTags.map(tag => (_jsx("span", { children: tag }, tag))) }), _jsxs("div", { className: "service-footer", children: [_jsxs("strong", { children: ["Rank ", service.rankingScore] }), _jsxs("span", { children: ["Rep ", service.reputation?.score ?? "n/a"] })] })] }, service.id))) })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: "Network Feed" }), _jsx("p", { children: "Discovery, routing, hiring, and settlement activity." })] }), _jsx("ul", { className: "feed", children: activity.map(item => (_jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: item.message }), _jsx("span", { children: new Date(item.createdAt).toLocaleTimeString() })] }), _jsxs("small", { children: [item.paymentMethod ? item.paymentMethod.toUpperCase() : "network", typeof item.amountUsd === "number" ? ` • $${item.amountUsd.toFixed(2)}` : ""] })] }, item.id))) })] })] })] }));
}
function MetricCard({ label, value }) {
    return (_jsxs("article", { className: "metric-card", children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }));
}
