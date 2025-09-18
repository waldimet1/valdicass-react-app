// api/delete-quote.js
import { adminDb, adminBucket } from "./_lib/firebaseAdmin.js";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(req, res) {
  try {
    // Quick health check
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        ping: true,
        bucket: adminBucket?.name || null,
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = typeof req.body === "object" ? req.body : {};
    const quoteId = String(body.quoteId || "").trim();
    if (!quoteId) {
      return res.status(400).json({ ok: false, error: "Missing quoteId" });
    }

    const ref = adminDb.doc(`quotes/${quoteId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ ok: false, error: "Quote not found" });
    }

    // Best-effort delete of the PDF in Storage
    let pdfDeleted = null;
    if (adminBucket) {
      const filePath = `quotes/${quoteId}/quote.pdf`;
      try {
        await adminBucket.file(filePath).delete({ ignoreNotFound: true });
        pdfDeleted = true;
      } catch (e) {
        pdfDeleted = false; // non-fatal
      }
    }

    // Delete Firestore doc
    await ref.delete();

    return res.status(200).json({ ok: true, pdfDeleted });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}






