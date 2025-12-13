// api/setAdmin.js
const admin = require("firebase-admin");

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env var: ${name}`);
  return v;
}

function initAdmin() {
  if (admin.apps.length) return;

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

module.exports = async (req, res) => {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,OPTIONS,PATCH,DELETE,POST,PUT"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-secret"
    );

    if (req.method === "OPTIONS") return res.status(200).end();

    // ✅ Init admin inside try/catch so Vercel shows the REAL error
    initAdmin();

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // 🔐 Secret check
    const secret = req.headers["x-admin-secret"];
    if (!secret || secret !== process.env.ADMIN_API_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { email, uid, admin: makeAdmin } = req.body || {};
    if (!email && !uid) {
      return res
        .status(400)
        .json({ error: "You must provide either 'email' or 'uid'." });
    }

    // Find user by email or uid
    const userRecord = email
      ? await admin.auth().getUserByEmail(email)
      : await admin.auth().getUser(uid);

    // Merge existing claims so we don't erase other flags
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
    console.error("❌ /api/setAdmin crashed:", err);
    return res.status(500).json({
      error: "Function failed",
      message: err.message,
      hint:
        "Check Vercel env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, ADMIN_API_SECRET",
    });
  }
};
