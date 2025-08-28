import { useState, useCallback } from "react";
import { sendQuoteEmail } from "@/features/quotes/api/sendQuoteEmail.client";
import { db } from "@/services/firebaseConfig";
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore";

/**
 * useSendQuote
 * - Sends the email via your API
 * - Logs "sent" or "send_failed" to Firestore (quoteLogs)
 */
export default function useSendQuote() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const send = useCallback(async ({ quoteId, clientEmail, clientName, total, createdBy }) => {
    setSending(true);
    setError(null);
    setResult(null);

    // Build a share URL the recipient can open
    const origin = typeof window !== "undefined" ? window.location.origin : "https://app.valdicass.com";
    const shareUrl = `${origin.replace(/\/$/, "")}/view-quote?id=${encodeURIComponent(quoteId)}`;

    try {
      // 1) call API
      const res = await sendQuoteEmail({ quoteId, clientEmail, clientName, total, shareUrl, createdBy });
      setResult(res);

      // 2) log to Firestore
      await addDoc(collection(db, "quoteLogs"), {
        quoteId,
        event: "sent",
        meta: { clientEmail, clientName, total, shareUrl },
        createdBy: createdBy || null,
        at: serverTimestamp(),
      });
      // 3) mark the quote itself as sent (helps list filters)
     await updateDoc(doc(db, "quotes", quoteId), {
       status: "sent",
       "statusTimestamps.sent": serverTimestamp(),
     });

      return { ok: true, res };
    } catch (e) {
      setError(e);
      // Best-effort failure log
      try {
        await addDoc(collection(db, "quoteLogs"), {
          quoteId,
          event: "send_failed",
          meta: { clientEmail, clientName, total, error: String(e?.message || e) },
          createdBy: createdBy || null,
          at: serverTimestamp(),
        });
      } catch (_) {}
      return { ok: false, error: e };
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending, error, result };
}
