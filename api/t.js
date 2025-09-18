// api/t.js
import { adminDb as staticDb, FieldValue, getAdminSafe } from "./_lib/firebaseAdmin";

// Fire-and-forget Slack helper (never throws)
async function notifySlackSafe(text) {
  try {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) return;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (_) {
    // swallow
  }
}

export default async function handler(req, res) {
  try {
    const { quoteId } = req.query || {};
    const to = (req.query?.to || "view").toString().toLowerCase();
    const dest = to === "pdf" ? "pdf" : "view";

    if (!quoteId) {
      res.status(400).send("missing quoteId");
      return;
    }

    // Compute redirect target first so we can always complete the request
    const app = process.env.APP_ORIGIN || `https://${req.headers.host}`;
    const target =
      dest === "pdf"
        ? `${app}/api/quote-pdf-redirect?id=${encodeURIComponent(quoteId)}`
        : `${app}/view-quote?id=${encodeURIComponent(quoteId)}`;

    // Kick off logging work in the background; never block the redirect
    (async () => {
      try {
        const adminDb =
          (typeof getAdminSafe === "function" ? await getAdminSafe() : null) ||
          staticDb;
        if (!adminDb) return; // no admin — skip logging silently

        const ua = req.headers["user-agent"] || null;
        const ip =
          req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          null;

        // Log the click
        await adminDb.collection("quoteLogs").add({
          quoteId: String(quoteId),
          type: dest === "pdf" ? "email_click_pdf" : "email_click_view",
          at: FieldValue.serverTimestamp(),
          ua,
          ip,
        });

        // Mark viewed when going to the view page
        if (dest === "view") {
          await adminDb.doc(`quotes/${quoteId}`).set(
            {
              viewed: true,
              status: "viewed",
              statusTimestamps: { viewed: FieldValue.serverTimestamp() },
            },
            { merge: true }
          );
          await notifySlackSafe(`👀 Quote viewed: ${quoteId}`);
        } else {
          await notifySlackSafe(`🖱️ PDF link clicked: ${quoteId}`);
        }
      } catch (err) {
        console.error("t.js background log error:", err);
      }
    })();

    // Always redirect the client
    res.writeHead(302, { Location: target, "Cache-Control": "no-store" });
    res.end();
  } catch (e) {
    console.error("t.js fatal:", e);
    res.status(500).send("error");
  }
}



