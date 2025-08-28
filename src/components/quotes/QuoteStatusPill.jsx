import React from "react";
import useQuoteLogs from "@/features/quotes/hooks/useQuoteLogs";

function fmt(tsMs) {
  if (!tsMs) return "—";
  const d = new Date(tsMs);
  return d.toLocaleString();
}

export default function QuoteStatusPill({ quoteId, showMeta = true }) {
  const { summary, loading } = useQuoteLogs(quoteId);

  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid transparent",
  };

  const colorByStatus = {
    draft:   { background: "#eef2ff", color: "#3730a3", borderColor: "#c7d2fe" },
    sent:    { background: "#f0f9ff", color: "#075985", borderColor: "#bae6fd" },
    viewed:  { background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" },
    signed:  { background: "#e6fffa", color: "#0f766e", borderColor: "#99f6e4" },
    declined:{ background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" },
  };

  const s = (summary?.status || "draft");
  const tone = colorByStatus[s] || colorByStatus.draft;

  return (
    <div>
      <span style={{ ...base, ...tone }}>
        {loading ? "…" : s.toUpperCase()}
      </span>
      {showMeta && !loading && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#555" }}>
          <span style={{ marginRight: 10 }}>
            Views: <strong>{summary.opensCount}</strong>
          </span>
          <span style={{ marginRight: 10 }}>
            First Open: <strong>{fmt(summary.openedAt)}</strong>
          </span>
          <span>
            Last Open: <strong>{fmt(summary.lastOpenedAt)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
