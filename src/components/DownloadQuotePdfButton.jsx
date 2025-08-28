import React from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import QuotePdf from "../pdf/QuotePdf";

/**
 * Client-side PDF download. Renders nothing if quote is missing.
 */
export default function DownloadQuotePdfButton({ quote, quoteId }) {
  if (!quote) return null;
  return (
    <PDFDownloadLink
      document={<QuotePdf quote={{ id: quoteId, ...quote }} />}
      fileName={`Valdicass_Quote_${quoteId || "DRAFT"}.pdf`}
    >
      {({ loading }) => (
        <button disabled={loading}>
          {loading ? "Building PDF…" : "Download PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}

