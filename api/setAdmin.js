// api/setAdmin.js
const admin = require("firebase-admin");

// Initialize Firebase Admin once per Lambda
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

module.exports = async (req, res) => {
  // CORS (same style as your other API files)
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

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

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

  try {
    // Find user by email or uid
    let userRecord;
    if (email) {
      userRecord = await admin.auth().getUserByEmail(email);
    } else {
      userRecord = await admin.auth().getUser(uid);
    }

    const targetUid = userRecord.uid;

    // Merge existing claims so we don't erase other flags
    const existingClaims = userRecord.customClaims || {};
    const newClaims = {
      ...existingClaims,
      admin: !!makeAdmin,
    };

    await admin.auth().setCustomUserClaims(targetUid, newClaims);

    return res.status(200).json({
      success: true,
      uid: targetUid,
      email: userRecord.email,
      claims: newClaims,
    });
  } catch (err) {
    console.error("❌ Error in /api/setAdmin:", err);
    return res.status(500).json({
      error: "Error setting admin claim",
      details: err.message,
    });
  }
};
