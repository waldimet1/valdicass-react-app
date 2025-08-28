// src/utils/renderAndUploadQuotePdf.jsx
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
 * Render <QuotePdf/> -> Blob, upload to Storage at quotes/{quoteId}/quote.pdf,
 * then write { pdfUrl, pdfUpdatedAt } back to Firestore.
 *
 * @param {object} quoteDoc Firestore quote object (must have createdBy on doc)
 * @param {string} quoteId  Firestore doc id
 * @param {(n:number)=>void} [onProgress]
 * @returns {Promise<string>} download URL
 */
export async function renderAndUploadQuotePdf(quoteDoc, quoteId, onProgress) {
  if (!quoteId) throw new Error("renderAndUploadQuotePdf: missing quoteId");
  if (!quoteDoc) throw new Error("renderAndUploadQuotePdf: missing quoteDoc");

  // 1) Render PDF -> Blob
  const blob = await pdf(<QuotePdf quote={{ id: quoteId, ...quoteDoc }} />).toBlob();

  // 2) Upload to Storage (must match rules)
  const storage = getStorage();
  const filePath = `quotes/${quoteId}/quote.pdf`;
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
