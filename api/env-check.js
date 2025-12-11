export default function handler(req, res) {
  const keys = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_STORAGE_BUCKET", // optional but nice
  ];
  const report = Object.fromEntries(keys.map((k) => [k, !!process.env[k]]));
  res.status(200).json({ ok: true, env: report, node: process.version });
}
