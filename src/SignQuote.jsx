// src/SignQuote.jsx
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db, auth, storage } from "./firebaseConfig";
import { signInAnonymously } from "firebase/auth";
import { ref as sref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { COMPANY } from "./companyInfo";

// helpers
const toClientName = (v) => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    return v.name || v.fullName || [v.firstName, v.lastName].filter(Boolean).join(" ").trim();
  }
  return "";
};
const getClientEmail = (q) =>
  q?.clientEmail || q?.email || q?.client?.email || q?.client?.clientEmail || "";

// optional server ping for alerts
async function notifyAdmin(event, data) {
  try {
    await fetch("/api/notify-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...data }),
    });
  } catch (e) {
    console.warn("Notify admin failed:", e);
  }
}

export default function SignQuote() {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("id");
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const sigRef = useRef(null);

  // make sure we have an auth user (anonymous is fine)
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((e) => {
        console.warn("Anonymous sign-in failed (will retry on upload):", e);
      });
    }
  }, []);

  // load quote
  useEffect(() => {
    (async () => {
      try {
        if (!quoteId) {
          setError("Missing quote id in the URL.");
          setLoading(false);
          return;
        }
        const snap = await getDoc(doc(db, "quotes", quoteId));
        if (!snap.exists()) {
          setError("Quote not found.");
          setLoading(false);
          return;
        }
        const q = { id: snap.id, ...snap.data() };
        setQuote(q);
        document.title = `Sign Quote • ${q.number || q.id}`;
      } catch (e) {
        console.error(e);
        setError("Failed to load quote.");
      } finally {
        setLoading(false);
      }
    })();
  }, [quoteId]);

  const clearSignature = () => sigRef.current?.clear();

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      alert("Please enter your full name.");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert("Please draw your signature.");
      return;
    }

    try {
      setSaving(true);

      // ensure we’re authenticated (anonymous ok)
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      // 1) Upload signature image to Storage
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      const filePath = `signatures/${quoteId}/${Date.now()}.png`;
      const fileRef = sref(storage, filePath);

      await uploadString(fileRef, dataUrl, "data_url", {
        contentType: "image/png",
        cacheControl: "public,max-age=31536000",
      });

      const signatureUrl = await getDownloadURL(fileRef);

      // 2) If there was a previous signature file, delete it
      const oldPath = quote?.signatureStoragePath;
      if (oldPath && oldPath !== filePath) {
        try { await deleteObject(sref(storage, oldPath)); } catch (_) {}
      }

      // 3) Update Firestore doc with URL + path (no base64)
      await updateDoc(doc(db, "quotes", quoteId), {
        signed: true,
        status: "Signed",
        "statusTimestamps.Signed": Timestamp.now(),
        signedBy: fullName.trim(),
        signedAt: Timestamp.now(),
        signatureUrl,
        signatureStoragePath: filePath,
        // optional: remove legacy base64 if it exists
        signatureDataUrl: null,
      });

      // 4) Notify admin (best-effort)
      await notifyAdmin("signed", {
        quoteId,
        clientName: toClientName(quote?.client) || "Customer",
        clientEmail: getClientEmail(quote),
        total: quote?.total || 0,
        signedBy: fullName.trim(),
        signatureUrl,
      });

      navigate(`/view-quote?id=${quoteId}`);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to submit signature. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // --- UI -------------------------------------------------------------------
  if (loading) return <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>;
  if (error)   return <div style={{ padding: 24, color: "crimson", textAlign: "center" }}>{error}</div>;
  if (!quote)  return null;

  if (quote.signed || (typeof quote.status === "string" && quote.status.toLowerCase() === "signed")) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <h2>Already Signed</h2>
        <p>
          This quote has already been signed{quote.signedBy ? ` by ${quote.signedBy}` : ""}.
        </p>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back to Quote</button>
      </div>
    );
  }
  if (quote.declined || (typeof quote.status === "string" && quote.status.toLowerCase() === "declined")) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, textAlign: "center" }}>
        <h2>Quote Declined</h2>
        <p>This quote has been marked as declined and cannot be signed.</p>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back to Quote</button>
      </div>
    );
  }

  const clientName = toClientName(quote.client);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>Agree & Sign</h1>

      <section style={{ marginBottom: 16 }}>
        <div><strong>Client:</strong> {clientName || "—"}</div>
        <div><strong>Total:</strong> ${Number(quote.total || 0).toLocaleString()}</div>
      </section>

      <label style={{ display: "block", marginBottom: 8 }}>
        Full Name (typing your name is part of your signature)
      </label>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="John Q. Client"
        autoComplete="name"
        style={{ width: "100%", padding: 10, marginBottom: 12, borderRadius: 8, border: "1px solid #dbe2ea" }}
      />

      <div style={{ marginBottom: 8 }}>Draw your signature below:</div>
      <div style={{ background: "#fff", border: "1px solid #dbe2ea", borderRadius: 12, padding: 8, marginBottom: 12, boxShadow: "0 10px 24px rgba(2,29,78,0.08)" }}>
        <SignatureCanvas
          ref={sigRef}
          penColor="#111"
          backgroundColor="#fff"
          canvasProps={{ width: 850, height: 200, style: { width: "100%", height: 200 } }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={clearSignature}>Clear</button>
        <button onClick={() => navigate(`/view-quote?id=${quoteId}`)}>Back</button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            marginLeft: "auto",
            background: "#0b63b2",
            color: "#fff",
            border: "none",
            padding: "10px 14px",
            borderRadius: 10,
            fontWeight: 700,
            opacity: saving ? 0.7 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Agree & Sign"}
        </button>
      </div>

      <div style={{ fontSize: 12, color: "#667085" }}>
        By clicking “Agree & Sign”, you agree that this electronic signature is the legal equivalent
        of your manual signature.
      </div>
    </div>
  );
}




