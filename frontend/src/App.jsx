import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from "recharts";

const API = "https://llm-observatory-backend.onrender.com";

const theme = {
  bg: "#0f1117",
  surface: "#353433",
  border: "#1b1a1a",
  accent: "#da7a0c",
  accentSoft: "#6b3805",
  textPrimary: "#f0f0f5",
  textSecondary: "#a8968b",
  green: "#4ade80",
  yellow: "#facc15",
};

function StatCard({ label, value }) {
  return (
    <div style={{
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      padding: "20px 24px",
      flex: 1,
    }}>
      <p style={{ color: theme.textSecondary, fontSize: 12, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, margin: "8px 0 0", color: theme.textPrimary }}>{value ?? "—"}</p>
    </div>
  );
}

function QualityBadge({ score }) {
  const color = score >= 0.8 ? theme.green : score >= 0.5 ? theme.yellow : "#f87171";
  return (
    <span style={{ color, fontWeight: 600 }}>{score?.toFixed(2) ?? "—"}</span>
  );
}

const tooltipStyle = {
  contentStyle: { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.textPrimary },
  labelStyle: { color: theme.textSecondary },
};

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [version, setVersion] = useState("v1");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [lastOutput, setLastOutput] = useState("");

  const fetchData = async () => {
    const [logsRes, statsRes] = await Promise.all([
      axios.get(`${API}/logs`),
      axios.get(`${API}/stats`),
    ]);
    setLogs(logsRes.data);
    setStats(statsRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCall = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/call`, { prompt, prompt_version: version });
      setLastOutput(res.data.output);
      fetchData();
    } finally {
      setLoading(false);
    }
  };

  const latencyData = [...logs].reverse().slice(0, 20).map((l, i) => ({
    call: i + 1,
    latency: l.latency_ms,
  }));

  const versionMap = {};
  logs.forEach(l => {
    if (!versionMap[l.prompt_version]) versionMap[l.prompt_version] = { total: 0, count: 0 };
    versionMap[l.prompt_version].total += l.quality_score;
    versionMap[l.prompt_version].count += 1;
  });
  const versionData = Object.entries(versionMap).map(([v, d]) => ({
    version: v,
    avg_quality: parseFloat((d.total / d.count).toFixed(2)),
  }));

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: theme.bg, minHeight: "100vh", padding: "32px 40px", color: theme.textPrimary }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>LLM Observatory</h1>
        </div>
        <p style={{ color: theme.textSecondary, margin: "6px 0 0 22px", fontSize: 14 }}>
          Monitor latency, cost, and quality across every LLM call
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Calls (7d)" value={stats.total_calls} />
        <StatCard label="Avg Latency" value={stats.avg_latency_ms ? `${stats.avg_latency_ms}ms` : null} />
        <StatCard label="Total Cost (7d)" value={stats.total_cost ? `$${stats.total_cost}` : null} />
        <StatCard label="Avg Quality Score" value={stats.avg_quality} />
      </div>

      {/* Prompt Box */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Send a Prompt
        </h2>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Type a prompt to test..."
          style={{
            width: "100%", height: 90, borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.bg,
            color: theme.textPrimary,
            padding: 12, fontSize: 14,
            boxSizing: "border-box", resize: "vertical",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
          <select
            value={version}
            onChange={e => setVersion(e.target.value)}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.bg, color: theme.textPrimary,
              fontSize: 14, cursor: "pointer",
            }}>
            <option value="v1">v1</option>
            <option value="v2">v2</option>
            <option value="v3">v3</option>
          </select>
          <button
            onClick={handleCall}
            disabled={loading}
            style={{
              background: loading ? theme.accentSoft : theme.accent,
              color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 24px", fontWeight: 600, fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}>
            {loading ? "Calling LLM..." : "Send"}
          </button>
          {loading && (
            <span style={{ color: theme.textSecondary, fontSize: 13 }}>
              Scoring output with judge model...
            </span>
          )}
        </div>

        {lastOutput && (
          <div style={{
            marginTop: 16, background: theme.accentSoft,
            border: `1px solid ${theme.accent}40`,
            borderRadius: 8, padding: 14, fontSize: 14, color: theme.textPrimary,
            lineHeight: 1.6,
          }}>
            <span style={{ color: theme.accent, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Last Output</span>
            <p style={{ margin: "8px 0 0" }}>{lastOutput}</p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <div style={{ flex: 2, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 20px", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Latency Over Time (ms)
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="call" stroke={theme.textSecondary} tick={{ fill: theme.textSecondary, fontSize: 12 }} />
              <YAxis stroke={theme.textSecondary} tick={{ fill: theme.textSecondary, fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="latency" stroke={theme.accent} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 20px", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Quality by Prompt Version
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={versionData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="version" stroke={theme.textSecondary} tick={{ fill: theme.textSecondary, fontSize: 12 }} />
              <YAxis domain={[0, 1]} stroke={theme.textSecondary} tick={{ fill: theme.textSecondary, fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="avg_quality" fill={theme.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Log Table */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 16px", color: theme.textSecondary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Recent Calls
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
              {["Prompt", "Version", "Model", "Latency", "Cost", "Quality"].map(h => (
                <th key={h} style={{ padding: "8px 12px", color: theme.textSecondary, textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${theme.border}`, background: i % 2 === 0 ? "transparent" : "#ffffff05" }}>
                <td style={{ padding: "10px 12px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: theme.textPrimary }}>{l.prompt}</td>
                <td style={{ padding: "10px 12px", color: theme.textSecondary }}>{l.prompt_version}</td>
                <td style={{ padding: "10px 12px", color: theme.textSecondary }}>{l.model}</td>
                <td style={{ padding: "10px 12px", color: theme.textPrimary }}>{l.latency_ms}ms</td>
                <td style={{ padding: "10px 12px", color: theme.textPrimary }}>${l.cost_usd?.toFixed(5)}</td>
                <td style={{ padding: "10px 12px" }}><QualityBadge score={l.quality_score} /></td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "32px 12px", textAlign: "center", color: theme.textSecondary }}>
                  No calls yet — send your first prompt above
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}