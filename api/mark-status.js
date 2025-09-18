// api/mark-status.js
import { adminDb, FieldValue } from "./_lib/firebaseAdmin";
import { notifyAdmin } from "./_lib/notifyAdmin";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method not allowed" });

    const { quoteId, status } = req.body || {};
    if (!quoteId || !["signed", "declined"].includes(status)) {
      return res.status(400).json({ ok:false, error:"Bad request" });
    }

    const ref = adminDb.doc(`quotes/${quoteId}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ ok:false, error:"Not found" });

    const data = snap.data() || {};
    const setObj = {
      status,
      statusTimestamps: { [status]: FieldValue.serverTimestamp() },
    };
    if (status === "signed") setObj.signed = true;
    if (status === "declined") setObj.declined = true;

    await ref.set(setObj, { merge: true });

    const displayName = (data.displayName || data.estimateName || "").trim() || quoteId;
    const total = Number(data.total || 0);
    const pretty = total ? ` ($${total.toLocaleString()})` : "";
    const app = process.env.APP_ORIGIN || `https://${req.headers.host}`;
    const link = `${app}/view-quote?id=${encodeURIComponent(quoteId)}`;

    await notifyAdmin(
      `${status === "signed" ? "✅ Signed" : "❌ Declined"} — ${displayName}`,
      `<div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
         <p><strong>${status.toUpperCase()}</strong>: ${displayName}${pretty}</p>
         <p><a href="${link}">Open in app</a></p>
       </div>`
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}
