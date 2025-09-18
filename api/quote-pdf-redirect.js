// api/quote-pdf-redirect.js
import { adminDb } from "./_lib/firebaseAdmin";

export default async function handler(req, res) {
  try {
    const id = req.query?.id;
    if (!id) return res.status(400).send("missing id");

    const snap = await adminDb.doc(`quotes/${id}`).get();
    const pdfUrl = snap.exists ? snap.data().pdfUrl : null;

    const app = process.env.APP_ORIGIN || `https://${req.headers.host}`;
    const fallback = `${app}/view-quote?id=${encodeURIComponent(id)}&noPdf=1`;

    res.writeHead(302, { Location: pdfUrl || fallback });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send("error");
  }
}

