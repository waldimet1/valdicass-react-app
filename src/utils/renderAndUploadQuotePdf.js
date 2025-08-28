// src/utils/renderAndUploadQuotePdf.js
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import QuotePdf from '../pdf/QuotePdf';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Renders the QuotePdf component to a Blob, uploads to
 * Storage at quotes/{quoteId}.pdf, retrieves the public URL,
 * and writes { pdfUrl, pdfUpdatedAt } back to Firestore.
 *
 * @param {object} quoteDoc  Firestore quote object (must include createdBy)
 * @param {string} quoteId   Firestore document id
 * @param {function(number):void} [onProgress] Optional upload progress (0..100)
 *
 * @returns {Promise<string>} download URL
 */
export async function renderAndUploadQuotePdf(quoteDoc, quoteId, onProgress) {
  if (!quoteId) throw new Error('renderAndUploadQuotePdf: missing quoteId');
  if (!quoteDoc) throw new Error('renderAndUploadQuotePdf: missing quoteDoc');

  // 1) Render PDF -> Blob (client-side)
  const blob = await pdf(<QuotePdf quote={{ id: quoteId, ...quoteDoc }} />).toBlob();

  // 2) Upload to Storage with progress tracking
  const storage = getStorage();
  const filePath = `quotes/${quoteId}/quote.pdf`;
  const pdfRef = ref(storage, filePath);
  const metadata = { contentType: 'application/pdf' };

  const task = uploadBytesResumable(pdfRef, blob, metadata);

  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(Math.round(pct));
        }
      },
      (err) => reject(err),
      () => resolve()
    );
  });

  // 3) Get public URL
  const url = await getDownloadURL(pdfRef);

  // 4) Save back to Firestore
  await updateDoc(doc(db, 'quotes', quoteId), {
    pdfUrl: url,
    pdfUpdatedAt: serverTimestamp(),
  });

  return url;
}
