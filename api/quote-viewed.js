// api/quote-viewed.js
import admin from "firebase-admin";

let app;
function getAdmin() {
  if (!app) {
    const json = process.env.FIREBASE_ADMIN_JSON;
    if (!json) throw new Error("FIREBASE_ADMIN_JSON not set");
    const creds = JSON.parse(json);
    app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert(creds),
        });
  }
  return app;
}

// a 1x1 transparent PNG (so we can be used as <img src=...>)
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
  "base64"
);

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
      return;
    }

    const id =
      req.method === "GET"
        ? (req.query.id || req.query.quoteId || "").toString()
        : (() => {
            try { return JSON.parse(req.body || "{}").id || JSON.parse(req.body || "{}").quoteId || ""; }
            catch { return ""; }
          })();

    if (!id) {
      // Return pixel anyway (no leak), but do nothing
      res.setHeader("Content-Type", "image/png");
      res.status(200).end(PIXEL);
      return;
    }

    const adminApp = getAdmin();
    const db = adminApp.firestore();
    const FieldValue = admin.firestore.FieldValue;

    const ref = db.collection("quotes").doc(id);

    // Update viewed flag + timestamp, and bump status to 'viewed' only if it isn't already
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;

      const data = snap.data() || {};
      const next = {
        viewed: true,
        "statusTimestamps.viewed": FieldValue.serverTimestamp(),
      };

      if (!data.status || data.status === "sent") {
        next.status = "viewed";
      }

      tx.update(ref, next);
    });

    // Serve a pixel so this endpoint works via <img>
    res.setHeader("Content-Type", "image/png");
    res.status(200).end(PIXEL);
  } catch (e) {
    console.error("quote-viewed error:", e.message);
    // Still return a pixel to avoid client console noise
    res.setHeader("Content-Type", "image/png");
    res.status(200).end(PIXEL);
  }
}
