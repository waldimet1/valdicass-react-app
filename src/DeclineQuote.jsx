// src/DeclineQuote.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

async function notifyAdmin(event, data) {
  try {
    await fetch("https://valdicass-server.vercel.app/notifyQuoteEvent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...data }),
    });
  } catch (e) {
    console.warn("Notify admin failed:", e);
  }
}

const DeclineQuote = () => {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("id");
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        if (!quoteId) {
          setError("Missing quote id in the URL.");
          setLoading(false);
          return;
        }
        const ref = doc(db, "quotes", quoteId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("Quote not found.");
          setLoading(false);
          return;
        }
        setQuote({ id: snap.id, ...snap.data() });
      } catch (e) {
        console.error(e);
        setError("Failed to load quote.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quoteId]);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!window.confirm("Are you sure you want to decline this quote?")) return;

    try {
      setSaving(true);
      const ref = doc(db, "quotes", quoteId);
      await updateDoc(ref, {
        declined: true,
        status: "declined",
        "statusTimestamps.declined": Timestamp.now(),
        declinedBy: fullName.trim(),
        declinedAt: Timestamp.now(),
        declinedReason: reason.trim() || null,
      });

      // notify admin
      notifyAdmin("declined", {
        quoteId,
        clientName: quote?.client?.name || "",
        clientEmail: quote?.client?.clientEmail || "",
        total: quote?.total || 0,
        declinedBy: fullName.trim(),
        declinedReason: reason.trim() || "",
      });

      alert("✅ This quote has been marked as declined.");
      navigate(`/view-quote?id=${quoteId}`);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to decline the quote. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: "crimson", textAlign: "center" }}>{error}</div>;
  if (!quote) return null;

  if (quote.signed) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <h2>Already Signed</h2>
        <p>This quote has already been signed and cannot be declined.</p>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back to Quote</button>
      </div>
    );
  }

  if (quote.declined) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <h2>Already Declined</h2>
        <p>This quote was already declined by {quote.declinedBy || "the client"}.</p>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back to Quote</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Decline Quote</h1>

      <section style={{ marginBottom: 16 }}>
        <div><strong>Client:</strong> {quote.client?.name || "—"}</div>
        <div><strong>Total:</strong> ${Number(quote.total || 0).toLocaleString()}</div>
      </section>

      <label style={{ display: "block", marginBottom: 8 }}>
        Your Full Name
      </label>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="John Q. Client"
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
          borderRadius: 6,
          border: "1px solid #ddd",
        }}
      />

      <label style={{ display: "block", marginBottom: 8 }}>
        Reason for declining (optional)
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g., going in a different direction, price too high, timing, etc."
        rows={4}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 12,
          borderRadius: 6,
          border: "1px solid #ddd",
          resize: "vertical",
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back</button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ marginLeft: "auto", background: "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, border: 0, fontWeight: 600 }}
        >
          {saving ? "Declining…" : "Confirm Decline"}
        </button>
      </div>
    </div>
  );
};

export default DeclineQuote;

