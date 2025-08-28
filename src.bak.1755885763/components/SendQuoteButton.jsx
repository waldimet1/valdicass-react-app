// src/components/SendQuoteButton.jsx
import React, { useState, useCallback } from "react";

/**
 * Props:
 *  - quoteId (string)
 *  - clientEmail (string)
 *  - clientName (string)
 *  - total (number)
 *  - shareUrl (string)
 *  - createdBy (string)
 *  - onSuccess?: (messageId: string) => void
 */
export default function SendQuoteButton({
  quoteId,
  clientEmail,
  clientName,
  total,
  shareUrl,
  createdBy,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);   // { ok, messageId } or { error, details }
  const [error, setError] = useState(null);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Basic front-end guardrails
      if (!quoteId || !clientEmail || !clientName || !total || !shareUrl) {
        throw new Error("Missing required fields.");
      }

      const res = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // the app serverless function will inject INVOKE_SECRET and forward to the API
        body: JSON.stringify({
          quoteId,
          clientEmail,
          clientName,
          total,
          shareUrl,
          createdBy,
        }),
      });

      // Read response (text first, then try JSON to get useful errors)
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

      if (!res.ok) {
        const details = data?.error || data?.raw || `HTTP ${res.status}`;
        throw new Error(typeof details === "string" ? details : JSON.stringify(details));
      }

      setResult(data);
      if (data?.messageId && typeof onSuccess === "function") onSuccess(data.messageId);
    } catch (err) {
      setError(err?.message || "Failed to send quote.");
    } finally {
      setLoading(false);
    }
  }, [quoteId, clientEmail, clientName, total, shareUrl, createdBy, onSuccess]);

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 480 }}>
      <button
        type="button"
        onClick={handleSend}
        disabled={loading}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: loading ? "#e5e7eb" : "#111827",
          color: loading ? "#111827" : "#fff",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Sending…" : "Send Quote"}
      </button>

      {result?.ok && (
        <div style={{ padding: 10, borderRadius: 8, background: "#ecfdf5", color: "#065f46" }}>
          ✅ Sent! Message ID: <code>{result.messageId || "(none)"}</code>
        </div>
      )}

      {error && (
        <div style={{ padding: 10, borderRadius: 8, background: "#fef2f2", color: "#991b1b" }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
