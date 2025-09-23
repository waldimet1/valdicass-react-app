// api/ping-api.js
function setCors(res, origin = "*") {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-KEY");
}

export default async function handler(req, res) {
  setCors(res, "*");
  if (req.method === "OPTIONS") return res.status(204).end();

  const base = process.env.SENDQUOTE_BASE_URL;
  if (!base) return res.status(500).json({ ok:false, error:"MISSING_ENV", detail:"SENDQUOTE_BASE_URL" });

  const apiHealth = `${base.replace(/\/$/,"")}/api/health`;
  try {
    const r = await fetch(apiHealth);
    const text = await r.text();
    return res.status(200).json({
      ok: true,
      apiUrl: apiHealth,
      upstreamStatus: r.status,
      sampleBody: text.slice(0, 200)
    });
  } catch (err) {
    return res.status(502).json({
      ok: false,
      error: "FETCH_FAILED",
      apiUrl: apiHealth,
      detail: err?.message || String(err)
    });
  }
}

