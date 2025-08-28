// /api/notify-quote.js — forwards to API: /api/notifyQuoteEvent
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
  const dec = new TextDecoder(); let raw = "";
  for await (const c of req) raw += typeof c === "string" ? c : dec.decode(c, { stream: true });
  raw += dec.decode();
  return raw ? JSON.parse(raw) : {};
}
// api/notify-quote.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const payload = await req.json().catch(() => ({})); // on Vercel Edge/Node — .json() works
    console.log("notify-quote:", payload);
    // TODO: call your API emailer or Slack webhook here
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "NOTIFY_FAILED" });
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-KEY");
    res.status(200).end(); return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED" }); return;
  }

  const { SENDQUOTE_BASE_URL, INVOKE_SECRET } = process.env;
  if (!SENDQUOTE_BASE_URL || !INVOKE_SECRET) {
    res.status(500).json({ error: "MISSING_ENV" }); return;
  }

  try {
    const body = await readJson(req);
    const resp = await fetch(`${SENDQUOTE_BASE_URL}/api/notifyQuoteEvent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": INVOKE_SECRET },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(resp.status).json(data);
  } catch (err) {
    console.error("notify-quote proxy error", { msg: err?.message });
    res.status(500).json({ error: "PROXY_ERROR", detail: err?.message || "fetch failed" });
  }
}
