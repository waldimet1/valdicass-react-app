// /api/send-quote.js – serverless proxy running in your React app project

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return req.body ? JSON.parse(req.body) : {};
  const dec = new TextDecoder(); let raw = "";
  for await (const c of req) raw += typeof c === "string" ? c : dec.decode(c, { stream: true });
  raw += dec.decode();
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-KEY");
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    return;
  }

  const { SENDQUOTE_BASE_URL, INVOKE_SECRET } = process.env;
  if (!SENDQUOTE_BASE_URL || !INVOKE_SECRET) {
    res.status(500).json({ error: "MISSING_ENV" });
    return;
  }

  try {
    const body = await readJson(req);

    const resp = await fetch(`${SENDQUOTE_BASE_URL}/api/sendQuoteEmail`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": INVOKE_SECRET
      },
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(resp.status).json(data);
  } catch (err) {
    console.error("send-quote proxy error", { msg: err?.message });
    res.status(500).json({ error: "PROXY_ERROR", detail: err?.message || "fetch failed" });
  }
}
