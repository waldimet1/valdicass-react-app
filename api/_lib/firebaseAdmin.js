// api/_lib/firebaseAdmin.js
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import admin from "firebase-admin";

let app;
if (!admin.apps.length) {
  // Prefer base64 env, fallback to raw JSON
  const json =
    process.env.FIREBASE_ADMIN_JSON_BASE64
      ? JSON.parse(
          Buffer.from(
            process.env.FIREBASE_ADMIN_JSON_BASE64,
            "base64"
          ).toString("utf8")
        )
      : JSON.parse(process.env.FIREBASE_ADMIN_JSON || "{}");

  app = admin.initializeApp({
    credential: admin.credential.cert(json),
    storageBucket:
      process.env.STORAGE_BUCKET ||
      process.env.VITE_STORAGE_BUCKET ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
} else {
  app = admin.app();
}

const bucket = admin.storage().bucket();

export { admin, bucket };

function loadServiceAccount() {
  const b64 = process.env.FIREBASE_ADMIN_JSON_BASE64;
  const raw = process.env.FIREBASE_ADMIN_JSON; // optional single-line JSON

  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf8");
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new Error(
        "FIREBASE_ADMIN_JSON_BASE64 is not valid base64 JSON (" + e.message + ")"
      );
    }
  }

  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      throw new Error(
        "FIREBASE_ADMIN_JSON must be single-line JSON (use JSON.stringify). " +
          e.message
      );
    }
  }

  throw new Error(
    "Missing credentials. Set FIREBASE_ADMIN_JSON_BASE64 in Vercel env."
  );
}

function init() {
  if (!getApps().length) {
    const creds = loadServiceAccount();

    const storageBucket =
      process.env.VITE_STORAGE_BUCKET ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      undefined;

    initializeApp({
      credential: cert(creds),
      ...(storageBucket ? { storageBucket } : {}),
    });
  }
}

init();

export const adminDb = getFirestore();
export const adminBucket = (() => {
  try {
    return getStorage().bucket();
  } catch {
    return null;
  }
})();





