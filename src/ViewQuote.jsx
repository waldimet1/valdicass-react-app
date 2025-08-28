// src/ViewQuote.jsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { toast } from "react-toastify";

import { db } from "./firebaseConfig";
import QuotePdf from "./pdf/QuotePdf";
import { renderAndUploadQuotePdf } from "./utils/renderAndUploadQuotePdf"; // <-- single correct import

export default function ViewQuote() {
  const location = useLocation();
  const quoteId = new URLSearchParams(location.search).get("id");

  const [quoteDoc, setQuoteDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPdf, setSavingPdf] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        if (!quoteId) {
          setLoading(false);
          return;
        }
        const snap = await getDoc(doc(db, "quotes", quoteId));
        if (snap.exists()) {
          setQuoteDoc({ id: quoteId, ...snap.data() });
        } else {
          toast.error("Quote not found");
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load quote");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [quoteId]);

  const handleSavePdf = async () => {
    if (!quoteDoc) {
      toast.error("No quote loaded");
      return;
    }
    try {
      setSavingPdf(true);
      setProgress(0);
      const url = await renderAndUploadQuotePdf(quoteDoc, quoteId, setProgress);
      setQuoteDoc((prev) => ({ ...prev, pdfUrl: url }));
      toast.success("PDF saved to quote");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save PDF");
    } finally {
      setSavingPdf(false);
    }
  };

  if (!quoteId) return <div>Missing <code>?id=</code> param in URL.</div>;
  if (loading) return <div>Loading…</div>;
  if (!quoteDoc) return <div>Quote not found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1>Estimate • {quoteId}</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        <button onClick={handleSavePdf} disabled={savingPdf}>
          {savingPdf ? `Saving… ${progress}%` : "Save PDF to Quote"}
        </button>

        <PDFDownloadLink
          document={<QuotePdf quote={quoteDoc} />}
          fileName={`Valdicass_Quote_${quoteId}.pdf`}
        >
          {({ loading }) => (
            <button disabled={loading}>
              {loading ? "Building PDF…" : "Download PDF"}
            </button>
          )}
        </PDFDownloadLink>

        {quoteDoc.pdfUrl && (
          <a href={quoteDoc.pdfUrl} target="_blank" rel="noreferrer">
            Open saved PDF
          </a>
        )}
      </div>
    </div>
  );
}






