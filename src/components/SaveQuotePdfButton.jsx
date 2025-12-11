// src/components/SaveQuotePdfButton.jsx
import React, { useState } from "react";

export default function SaveQuotePdfButton({ quoteId, onSaved }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!quoteId) {
      alert("Missing quoteId");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/save-quote-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });

      // Tolerant parsing: if server returned HTML error, avoid JSON parse crash
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { ok: false, error: raw.slice(0, 400) }; // show first part of HTML/error
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      onSaved?.(data.url);
      alert("✅ PDF saved.");
    } catch (e) {
      console.error("save-quote-pdf failed:", e);
      alert(`❌ Failed to save PDF\n${String(e?.message || e).slice(0, 400)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-busy={busy ? "true" : "false"}
      className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-60"
    >
      {busy ? "Saving…" : "Save PDF"}
    </button>
  );
}







