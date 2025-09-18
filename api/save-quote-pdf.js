// api/save-quote-pdf.js
export const config = {
  runtime: "nodejs",     // per-file accepts only "nodejs" or "edge"
  maxDuration: 60,
  memory: 1536
};



import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getStorage } from 'firebase-admin/storage';
import admin from './_lib/firebaseAdmin.js'; // your existing admin init

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const started = Date.now();
  try {
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

    const { quoteId } = req.body || {};
    if (!quoteId) return json(res, 400, { ok: false, error: 'Missing quoteId' });

    const appOrigin = process.env.APP_ORIGIN || 'https://app.valdicass.com';
    const url = `${appOrigin}/view-quote?id=${encodeURIComponent(quoteId)}`;

    console.log('[PDF] begin', { quoteId, url, node: process.version });

    // Launch chrome on Vercel
    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1400, height: 1800, deviceScaleFactor: 2 },
      executablePath,
      headless: chromium.headless, // true on server
    });

    try {
      const page = await browser.newPage();

      // Speed-up: skip images/fonts/css (we just need text/layout)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const t = req.resourceType();
        if (t === 'image' || t === 'font' || t === 'stylesheet') req.abort();
        else req.continue();
      });

      console.log('[PDF] goto', url);
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
      const httpStatus = resp?.status();
      if (!httpStatus || httpStatus >= 400) {
        throw new Error(`Failed to load page: HTTP ${httpStatus || 'unknown'}`);
      }

      // Optional: wait for the page content to render fully
      await page.waitForSelector('.vq-page', { timeout: 20_000 });

      console.log('[PDF] generating…');
      const pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      });

      // Upload to Firebase Storage
      const bucketName =
        process.env.VITE_FIREBASE_STORAGE_BUCKET ||
        process.env.VITE_STORAGE_BUCKET; // whichever you use elsewhere
      if (!bucketName) throw new Error('Missing storage bucket env');

      const bucket = getStorage(admin).bucket(bucketName);
      const filename = `quotes/${quoteId}/quote-${quoteId}.pdf`;
      const file = bucket.file(filename);

      console.log('[PDF] uploading', { bucket: bucketName, filename });
      await file.save(pdf, {
        contentType: 'application/pdf',
        resumable: false,
        public: false,
      });

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      const ms = Date.now() - started;
      console.log('[PDF] done', { ms, size: pdf.length });

      return json(res, 200, { ok: true, url: signedUrl, path: filename });
    } finally {
      // Always close browser
      try { await browser.close(); } catch (e) { console.warn('[PDF] close error', e); }
    }
  } catch (err) {
    console.error('[PDF] ERROR', err?.stack || err);
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}



