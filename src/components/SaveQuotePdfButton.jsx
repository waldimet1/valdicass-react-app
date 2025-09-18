// src/components/SaveQuotePdfButton.jsx
import React, { useState } from "react";

export default function SaveQuotePdfButton({ quoteId, onSaved }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    try {
      setBusy(true);
      const res = await fetch("/api/save-quote-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown error");
      onSaved?.(json.url);
      alert("✅ PDF saved: " + json.url);
      window.open(json.url, "_blank");
    } catch (e) {
      alert("❌ Failed to save PDF\n" + e.message);
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={run} disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded">
      {busy ? "Saving…" : "Save PDF"}
    </button>
  );
}





