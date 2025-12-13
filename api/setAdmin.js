// api/setAdmin.js  (ESM)
import admin from "firebase-admin";

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env var: ${name}`);
  return v;
}

function initAdmin() {
  if (admin.apps?.length) return;

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const privateKeyRaw = requireEnv("FIREBASE_PRIVATE_KEY");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
    }),
  });
}

export default async function handler(req, res) {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, x-admin-secret"
    );

    if (req.method === "OPTIONS") return res.status(200).end();

    // init inside try/catch
    initAdmin();

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const secret = req.headers["x-admin-secret"];
    if (!secret || secret !== process.env.ADMIN_API_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { email, uid, admin: makeAdmin } = req.body || {};
    if (!email && !uid) {
      return res
        .status(400)
        .json({ error: "Provide 'email' or 'uid'." });
    }

    const userRecord = email
      ? await admin.auth().getUserByEmail(email)
      : await admin.auth().getUser(uid);

    const existingClaims = userRecord.customClaims || {};
    const newClaims = { ...existingClaims, admin: !!makeAdmin };

    await admin.auth().setCustomUserClaims(userRecord.uid, newClaims);

    return res.status(200).json({
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      claims: newClaims,
    });
  } catch (err) {
    console.error("❌ /api/setAdmin error:", err);
    return res.status(500).json({
      error: "Function failed",
      message: err.message,
      hint:
        "Check env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, ADMIN_API_SECRET",
    });
  }
}
