export const config = { runtime: "nodejs", maxDuration: 60, memory: 1536 };

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { getStorage } from "firebase-admin/storage";
import app from "./_lib/firebaseAdmin.js";       // <- the App we just exported
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore(app);

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

const friendlyId = (q, fallbackId) =>
  (
    q?.displayName ||       // <- use the estimate name you entered
    q?.title ||
    q?.number ||
    q?.quoteNumber ||
    q?.customId ||
    q?.client?.name ||
    fallbackId ||
    ""
  ).toString().trim();

const safeSlug = (s) =>
  String(s).replace(/[^a-z0-9\-_.]+/gi, "-").replace(/-+/g, "-").slice(0, 80);

export default async function handler(req, res) {
  const started = Date.now();
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

    // Tolerate either object or string body
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { quoteId } = body;
    if (!quoteId) return json(res, 400, { ok: false, error: "Missing quoteId" });

    // Fetch quote for naming
    let qData = null;
    try {
      const snap = await db.collection("quotes").doc(quoteId).get();
      if (snap.exists) qData = snap.data();
    } catch (_) {}
    const displaySlug = safeSlug(friendlyId(qData, quoteId));

    const appOrigin = process.env.APP_ORIGIN || "https://app.valdicass.com";
    const url = `${appOrigin}/view-quote?id=${encodeURIComponent(
      quoteId
    )}&print=1&utm_source=pdf&utm_medium=renderer&utm_campaign=save-quote-pdf`;

    // Launch headless Chrome
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1400, height: 1800, deviceScaleFactor: 2 },
      executablePath,
      headless: chromium.headless,
    });

    let signedUrl;
    let filename;

    try {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on("request", (r) => {
        const t = r.resourceType();
        if (t === "image" || t === "font") r.abort();
        else r.continue();
      });

      const resp = await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
      const httpStatus = resp?.status();
      if (!httpStatus || httpStatus >= 400) throw new Error(`Failed to load page: HTTP ${httpStatus || "unknown"}`);

      await page.waitForSelector("body", { timeout: 20_000 });

      const pdf = await page.pdf({
        format: "Letter",
        printBackground: true,
        margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
      });

      // Resolve a bucket
      const explicitBucket =
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.VITE_FIREBASE_STORAGE_BUCKET ||
        app.options?.storageBucket;
      if (!explicitBucket) throw new Error("Missing storage bucket (set FIREBASE_STORAGE_BUCKET)");

      const storage = getStorage(app);
      const bucket = storage.bucket(explicitBucket);

      filename = `quotes/${quoteId}/estimate-${displaySlug || quoteId}.pdf`;
      const file = bucket.file(filename);

      await file.save(pdf, { contentType: "application/pdf", resumable: false, public: false });

      [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      });

      const ts = FieldValue.serverTimestamp();

      await db.collection("quotes").doc(quoteId).set(
        {
          pdfUrl: signedUrl,
          pdfPath: filename,
          pdfGeneratedAt: ts,
          lastUpdatedAt: ts,
        },
        { merge: true }
      );

      await db.collection("quoteLogs").add({
        quoteId,
        event: "PDF_GENERATED",
        file: filename,
        url: signedUrl,
        at: ts,
      });

    } finally {
      try { await browser.close(); } catch {}
    }

    return json(res, 200, { ok: true, url: signedUrl, path: filename });
  } catch (err) {
    console.error("[save-quote-pdf] ERROR:", err?.stack || err);
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}




