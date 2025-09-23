// api/debug-admin.js
import { adminDb, adminStorage } from "./_lib/firebaseAdmin.js";
export default async function handler(_req, res) {
  try {
    const bucketName = adminStorage.bucket().name;
    await adminDb.collection("_debug").limit(1).get();
    res.status(200).json({ ok: true, bucketName });
  } catch (e) {
    res.status(500).json({ ok: false, detail: String(e) });
  }
}
