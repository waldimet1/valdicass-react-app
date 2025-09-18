// api/pixel.js
import { adminDb, FieldValue } from "./_lib/firebaseAdmin";

const ONE_PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAGmAKn3s/3EwAAAABJRU5ErkJggg==",
  "base64"
);

export default async function handler(req, res) {
  try {
    const { quoteId } = req.query || {};
    if (quoteId) {
      await adminDb.collection("quoteLogs").add({
        quoteId,
        type: "email_open_pixel",
        at: FieldValue.serverTimestamp(),
        ua: req.headers["user-agent"] || null,
      });
    }
  } catch (e) {
    console.error(e);
  } finally {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).send(ONE_PX);
  }
}
