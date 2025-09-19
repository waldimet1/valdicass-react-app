// src/ViewQuote.jsx
import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import { signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import valdicassLogo from "./assets/valdicass-logo.png";

export default function ViewQuote() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [quoteId, setQuoteId] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        setQuoteId(id || "");
        if (!id) {
          setErr("Missing quote id.");
          setLoading(false);
          return;
        }

        // ensure read access (your rules require request.auth != null)
      if (!auth.currentUser) await signInAnonymously(auth);

try {
  if (!auth.currentUser) await signInAnonymously(auth);

const functions = getFunctions(undefined, "us-central1");
const logOpened = httpsCallable(functions, "createQuoteViewNotification");
await logOpened({ quoteId: id });   // must be exactly this shape
} catch (e) {
  console.warn("log-opened failed:", e?.message || e);
}

        // load quote
        const snap = await getDoc(doc(db, "quotes", id));
        if (!snap.exists()) {
          setErr("Quote not found.");
          setLoading(false);
          return;
        }
        const q = snap.data();

        // pick a PDF URL
        const directPdf = q.pdfUrl && typeof q.pdfUrl === "string" ? q.pdfUrl : "";
        // fall back to server endpoint that redirects to storage URL
        const fallbackPdf = `/api/quote-pdf-redirect?id=${encodeURIComponent(id)}`;

        setPdfUrl(directPdf || fallbackPdf);

        // log OPENED (2nd gen)
        try {
          const fn = httpsCallable(
            getFunctions(undefined, "us-central1"),
            "createQuoteViewNotification"
          );
          await fn({ quoteId: id });
        } catch (e) {
          // non-blocking
          console.warn("log-opened failed:", e?.message || e);
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load quote.");
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      {/* simple header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          borderBottom: "1px solid rgba(10,20,40,.08)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img src={valdicassLogo} alt="Valdicass" style={{ height: 28 }} />
        <div style={{ fontWeight: 800 }}>Valdicass Inc.</div>
        <div style={{ marginLeft: "auto", color: "#6b7280" }}>
          Estimate ID: {quoteId || "—"}
        </div>
      </div>

      {/* body */}
      <div style={{ padding: 0 }}>
        {loading && (
          <div style={{ padding: 24, color: "#6b7280" }}>Loading…</div>
        )}
        {err && !loading && (
          <div style={{ padding: 24, color: "#b4232a" }}>{err}</div>
        )}
        {!loading && !err && pdfUrl && (
          <iframe
            title="Estimate PDF"
            src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
            style={{
              width: "100%",
              height: "calc(100vh - 62px)",
              border: "none",
              background: "#fff",
            }}
            allow="fullscreen"
          />
        )}

        {/* fallback link if iframe can’t render for any reason */}
        {!loading && !err && pdfUrl && (
          <div style={{ padding: 12, textAlign: "center" }}>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Open PDF in new tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}












