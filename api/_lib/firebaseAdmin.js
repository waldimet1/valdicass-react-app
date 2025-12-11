// api/_lib/firebaseAdmin.js
import { initializeApp, getApps, getApp, cert, applicationDefault } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';

function buildCredential() {
  // Option A: individual env vars (recommended)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Convert escaped newlines to real newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  // Option B: whole JSON in one var (string or base64)
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const tryParse = (s) => {
      const j = JSON.parse(s);
      if (j.private_key && j.private_key.includes('\\n')) {
        j.private_key = j.private_key.replace(/\\n/g, '\n');
      }
      return j;
    };

    try {
      return cert(tryParse(raw));
    } catch {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        return cert(tryParse(decoded));
      } catch {
        // fall through
      }
    }
  }

  // Last resort (usually not present on Vercel)
  return applicationDefault();
}

const app =
  getApps().length
    ? getApp()
    : initializeApp({
        credential: buildCredential(),
        storageBucket:
          process.env.FIREBASE_STORAGE_BUCKET ||
          `${process.env.FIREBASE_PROJECT_ID || ''}.appspot.com`,
      });

// Optional: export helpers if you want to import them elsewhere
export default app;
export const adminStorage = () => getStorage(app);
export const adminDb = () => getFirestore(app);








