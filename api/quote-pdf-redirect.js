// api/quote-pdf-redirect.js (ESM)
import admin from "firebase-admin";

try {
  admin.app();
} catch {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let sa = undefined;
  if (raw) {
    sa = JSON.parse(raw);
    if (sa?.private_key?.includes("\\n")) {
      sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    }
  }
  admin.initializeApp(
    sa
      ? { credential: admin.credential.cert(sa) }
      : { credential: admin.credential.applicationDefault() }
  );
}

const db = admin.firestore();

export default async function handler(req, res) {
  try {
    const id = req.query?.id || req.query?.quoteId;
    if (!id) return res.status(400).send("id required");

    const snap = await db.collection("quotes").doc(id).get();
    if (!snap.exists) return res.status(404).send("quote not found");

    const q = snap.data();
    const url =
      q?.pdfUrl || q?.pdfURL || q?.pdf || q?.fileUrl || q?.url || "";

    if (!url) return res.status(404).send("pdfUrl missing on quote");

    res.setHeader("Location", url);
    res.status(302).end();
  } catch (e) {
    console.error("quote-pdf-redirect error:", e);
    res.status(500).send(e?.message || "server error");
  }
}







