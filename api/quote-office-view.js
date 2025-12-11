// api/quote-office-view.js
export const config = { runtime: "nodejs" };

import admin from "./_lib/firebaseAdmin.js";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const BUCKET =
  process.env.VITE_FIREBASE_STORAGE_BUCKET ||
  process.env.VITE_STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET;

export default async function handler(req, res) {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).send("id is required");

    const db = getFirestore(admin);
    const snap = await db.collection("quotes").doc(id).get();
    if (!snap.exists) return res.status(404).send("Quote not found");

    const path = snap.data()?.uploadedFile?.path;
    if (!path) return res.status(404).send("No uploaded file on quote");

    const [signed] = await getStorage(admin)
      .bucket(BUCKET)
      .file(path)
      .getSignedUrl({ action: "read", expires: Date.now() + 1000 * 60 * 10 });

    // Microsoft Office Web Viewer (embed)
    const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      signed
    )}`;

    res.setHeader("Cache-Control", "no-store");
    res.writeHead(302, { Location: viewer });
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
}

