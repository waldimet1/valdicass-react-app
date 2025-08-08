// src/SignQuote.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

const SignQuote = () => {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("id");
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const sigRef = useRef(null);

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

  const clearSignature = () => sigRef.current?.clear();

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert("Please provide your signature.");
      return;
    }

    try {
      setSaving(true);
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");

      const ref = doc(db, "quotes", quoteId);

      await updateDoc(ref, {
        signed: true,
        status: "signed",
        "statusTimestamps.signed": Timestamp.now(),
        signedBy: fullName.trim(),
        signedAt: Timestamp.now(),
        signatureDataUrl: dataUrl, // optional, remove if you don't want to store it
      });

      alert("✅ Thank you! Your quote has been signed.");
      navigate(`/view-quote?id=${quoteId}`); // or `/view?id=...` if that's your route
    } catch (e) {
      console.error(e);
      alert("❌ Failed to submit signature. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  }
  if (error) {
    return <div style={{ padding: 24, color: "crimson", textAlign: "center" }}>{error}</div>;
  }
  if (!quote) return null;

  if (quote.signed) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <h2>Already Signed</h2>
        <p>This quote has already been signed by {quote.signedBy || "the client"}.</p>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back to Quote</button>
      </div>
    );
  }
  if (quote.declined) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <h2>Quote Declined</h2>
        <p>This quote has been marked as declined and cannot be signed.</p>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back to Quote</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Sign Your Quote</h1>

      <section style={{ marginBottom: 16 }}>
        <div><strong>Client:</strong> {quote.client?.name || "—"}</div>
        <div><strong>Total:</strong> ${Number(quote.total || 0).toLocaleString()}</div>
      </section>

      <label style={{ display: "block", marginBottom: 8 }}>
        Full Name (typing your name is part of your signature)
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

      <div style={{ marginBottom: 8 }}>Draw your signature below:</div>
      <div
        style={{
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 8,
          marginBottom: 12,
        }}
      >
        <SignatureCanvas
          ref={sigRef}
          penColor="#111"
          canvasProps={{ width: 850, height: 200, style: { width: "100%", height: 200 } }}
          backgroundColor="#fff"
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={clearSignature}>Clear</button>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back</button>
        <button onClick={handleSubmit} disabled={saving} style={{ marginLeft: "auto" }}>
          {saving ? "Saving…" : "Agree & Sign"}
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#666" }}>
        By clicking “Agree & Sign”, you agree that this electronic signature is the legal equivalent
        of your manual signature.
      </div>
    </div>
  );
};

export default SignQuote;
