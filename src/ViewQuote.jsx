// src/ViewQuote.jsx
import React, { useEffect, useRef, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import { signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import valdicassLogo from "./assets/valdicass-logo.png";

export default function ViewQuote() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [viewerUrl, setViewerUrl] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [headerId, setHeaderId] = useState("");
  const ran = useRef(false); // prevent double-run in React StrictMode

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        setQuoteId(id || "");
        if (!id) {
          setErr("Missing quote id.");
          setLoading(false);
          return;
        }

        // Ensure Firestore read access (rules require auth)
        if (!auth.currentUser) await signInAnonymously(auth);

        // Fire-and-forget: log OPENED
        try {
          const fn = httpsCallable(
            getFunctions(undefined, "us-central1"),
            "createQuoteViewNotification"
          );
          await fn({ quoteId: id });
        } catch (e) {
          console.warn("log-opened failed:", e?.message || e);
        }

        // Load the quote
        const snap = await getDoc(doc(db, "quotes", id));
        if (!snap.exists()) {
          setErr("Quote not found.");
          setLoading(false);
          return;
        }
        const q = snap.data();

        // Header display (prefer your human-friendly fields)
        const displayId =
   q.displayName ||            // ← use the field you set in the form
   q.title ||
   q.friendlyName ||
   q.number ||
   q.quoteNumber ||
   q.customId ||
   (q.client?.name ? `${q.client.name}` : "") ||
   id;
        setHeaderId(displayId);

        // Decide how to view:
        // 1) If salesperson uploaded a file, prefer that (PDF → direct viewer, DOCX → Office viewer)
        const uploadedType = q?.uploadedFile?.contentType || "";
        if (uploadedType === "application/pdf") {
          setViewerUrl(`/api/quote-file-redirect?id=${encodeURIComponent(id)}`);
          setLoading(false);
          return;
        }
        if (
          uploadedType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          setViewerUrl(`/api/quote-office-view?id=${encodeURIComponent(id)}`);
          setLoading(false);
          return;
        }

        // 2) If a direct PDF URL is stored on the quote, use it
        const directPdf =
          (typeof q.pdfUrl === "string" && q.pdfUrl) ||
          (typeof q.signaturePdfUrl === "string" && q.signaturePdfUrl) ||
          "";

        if (directPdf) {
          setViewerUrl(directPdf);
          setLoading(false);
          return;
        }

        // 3) Legacy fallback: our redirect that signs a storage PDF
        setViewerUrl(`/api/quote-pdf-redirect?id=${encodeURIComponent(id)}`);
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load quote.");
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      {/* Header */}
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
          Estimate: {headerId || "—"}
        </div>
      </div>

      {/* Body */}
      <div>
        {loading && (
          <div style={{ padding: 24, color: "#6b7280" }}>Loading…</div>
        )}
        {err && !loading && (
          <div style={{ padding: 24, color: "#b4232a" }}>{err}</div>
        )}
        {!loading && !err && viewerUrl && (
          <>
            <iframe
              title="Estimate"
              src={`${viewerUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              style={{
                width: "100%",
                height: "calc(100vh - 62px)",
                border: "none",
                background: "#fff",
              }}
              allow="fullscreen"
            />
            <div style={{ padding: 12, textAlign: "center" }}>
              <a href={viewerUrl} target="_blank" rel="noopener noreferrer">
                Open in new tab
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}















