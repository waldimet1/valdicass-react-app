// src/utils/renderAndUploadQuotePdf.js
import React from "react";
import { pdf } from "@react-pdf/renderer";
import QuotePdf from "../pdf/QuotePdf";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Renders the QuotePdf component to a Blob, uploads to
 * Storage at quotes/{quoteId}/quote.pdf, retrieves the public URL,
 * and writes { pdfUrl, pdfUpdatedAt } back to Firestore.
 *
 * @param {object} quoteDoc
 * @param {string} quoteId
 * @param {(n:number)=>void} [onProgress]
 * @returns {Promise<string>} download URL
 */
export async function renderAndUploadQuotePdf(quoteDoc, quoteId, onProgress) {
  if (!quoteId) throw new Error("renderAndUploadQuotePdf: missing quoteId");
  if (!quoteDoc) throw new Error("renderAndUploadQuotePdf: missing quoteDoc");

  // 1) Render PDF -> Blob (client-side) WITHOUT JSX in a .js file
  const element = React.createElement(QuotePdf, {
    quote: { id: quoteId, ...quoteDoc },
  });
  const blob = await pdf(element).toBlob();

  // 2) Upload to Storage with progress tracking
  const storage = getStorage();
  const filePath = `quotes/${quoteId}/quote.pdf`; // must match Storage rules
  const pdfRef = ref(storage, filePath);
  const metadata = { contentType: "application/pdf" };

  const task = uploadBytesResumable(pdfRef, blob, metadata);
  await new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (err) => reject(err),
      () => resolve()
    );
  });

  // 3) Get public URL
  const url = await getDownloadURL(pdfRef);

  // 4) Save to Firestore
  await updateDoc(doc(db, "quotes", quoteId), {
    pdfUrl: url,
    pdfUpdatedAt: serverTimestamp(),
  });

  return url;
}
