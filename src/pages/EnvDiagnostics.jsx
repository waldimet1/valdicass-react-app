import React, { useEffect, useMemo, useState } from "react";

/**
 * Safe diagnostics: reads import.meta.env directly (no strict throws).
 * ASCII only to avoid hidden unicode issues from copy/paste.
 */

const ROW = { OK: "ok", WARN: "warn", FAIL: "fail" };

function StatusPill({ status, label }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  };
  const tone =
    status === ROW.OK
      ? { background: "rgba(16,185,129,.12)", color: "#065F46" } // green
      : status === ROW.WARN
      ? { background: "rgba(245,158,11,.15)", color: "#7C2D12" } // amber
      : { background: "rgba(239,68,68,.15)", color: "#7F1D1D" }; // red
  const icon = status === ROW.OK ? "✅" : status === ROW.WARN ? "⚠️" : "❌";
  return (
    <span style={{ ...base, ...tone }}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

function Row({ name, status, help }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
      <div style={{ fontWeight: 600 }}>{name}</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <StatusPill status={status} label={status.toUpperCase()} />
        {help && <div style={{ fontSize: 12, color: "#555", maxWidth: 520 }}>{help}</div>}
      </div>
    </div>
  );
}

const looksPlaceholder = (val) => /(^YOUR[_-])|(YOUR_PROJECT)|(YOUR_KEY)/i.test(val || "");

export default function EnvDiagnostics() {
  const env = import.meta.env;

  const checks = useMemo(() => {
    const fields = [
      { key: "VITE_FIREBASE_API_KEY", label: "Firebase API Key" },
      { key: "VITE_FIREBASE_AUTH_DOMAIN", label: "Firebase Auth Domain" },
      { key: "VITE_FIREBASE_PROJECT_ID", label: "Firebase Project ID" },
      { key: "VITE_FIREBASE_STORAGE_BUCKET", label: "Firebase Storage Bucket" },
      { key: "VITE_FIREBASE_MESSAGING_SENDER_ID", label: "Firebase Sender ID" },
      { key: "VITE_FIREBASE_APP_ID", label: "Firebase App ID" },
      { key: "VITE_SENDQUOTE_API_BASE_URL", label: "Email API Base URL" },
    ];

    return fields.map(({ key, label }) => {
      const val = env[key];
      let status = ROW.FAIL;
      let help = "Missing. Set this in your .env.local and Vercel project settings.";

      if (val) {
        if (looksPlaceholder(val)) {
          status = ROW.WARN;
          help = "Looks like a placeholder (e.g., YOUR_KEY). Replace with the real value.";
        } else {
          status = ROW.OK;
          help = "Present.";
        }
      }

      if (key === "VITE_SENDQUOTE_API_BASE_URL" && val) {
        const startsHttps = /^https?:\/\//.test(val);
        if (!startsHttps) {
          status = ROW.WARN;
          help = "Should start with https:// and point to your /api base.";
        }
      }

      return { name: label, status, help };
    });
  }, [env]);

  const [health, setHealth] = useState({ status: "idle", detail: "" });

  const runHealthCheck = async () => {
    const base = String(env.VITE_SENDQUOTE_API_BASE_URL || "").replace(/\/$/, "");
    if (!base) {
      setHealth({ status: "fail", detail: "VITE_SENDQUOTE_API_BASE_URL is missing." });
      return;
    }
    setHealth({ status: "pending", detail: "Checking..." });
    try {
      const res = await fetch(base + "/health", { method: "GET" });
      const text = await res.text().catch(() => "");
      if (res.ok) setHealth({ status: "ok", detail: text || "OK" });
      else setHealth({ status: "fail", detail: res.status + " " + res.statusText + (text ? " — " + text : "") });
    } catch (e) {
      setHealth({ status: "fail", detail: e && e.message ? e.message : String(e) });
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const card = {
    maxWidth: 980,
    margin: "30px auto",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 30px rgba(0,0,0,.08)",
    padding: 24,
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={card}>
        <h1 style={{ fontSize: 22, margin: "0 0 8px 0" }}>Environment Diagnostics</h1>
        <p style={{ color: "#555", margin: "0 0 18px 0" }}>
          Checks required VITE_* variables and calls the Email API /health endpoint. Values are not displayed.
        </p>

        {checks.map((c) => (
          <Row key={c.name} name={c.name} status={c.status} help={c.help} />
        ))}

        <div style={{ marginTop: 22, paddingTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>API Health Check</div>
            {health.status === "ok" && <StatusPill status={ROW.OK} label="OK" />}
            {health.status === "fail" && <StatusPill status={ROW.FAIL} label="FAIL" />}
            {health.status === "pending" && <StatusPill status={ROW.WARN} label="CHECKING" />}
            {health.status === "idle" && <StatusPill status={ROW.WARN} label="IDLE" />}
          </div>

          <div style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>{health.detail || "—"}</div>

          <button
            onClick={runHealthCheck}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#f7f7f7",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Re-run Health Check
          </button>
        </div>
      </div>
    </div>
  );
}


