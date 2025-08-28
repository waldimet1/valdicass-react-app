import React, { useState } from "react";
import { renderAndUploadQuotePdf } from './utils/renderAndUploadQuotePdf.jsx';
 

/**
 * Saves a PDF to Storage at quotes/{quoteId}/quote.pdf and writes pdfUrl to Firestore.
 * Renders nothing if quote or quoteId are missing.
 */
export default function SaveQuotePdfButton({ quote, quoteId, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!quote || !quoteId) return null; // prevents ReferenceError & useless button

  async function handleClick() {
    try {
      setSaving(true);
      setProgress(0);
      const url = await renderAndUploadQuotePdf(quote, quoteId, setProgress);
      onSaved?.(url);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={saving} title="Save PDF to quote">
      {saving ? `Saving… ${progress}%` : "Save PDF to Quote"}
    </button>
  );
}
