// api/send-quote.js
import sgMail from "@sendgrid/mail";

const allowedDomain = (process.env.SENDGRID_ALLOWED_FROM_DOMAIN || "").toLowerCase();
const fallbackFrom  = process.env.SENDGRID_FROM;

function isAllowedFrom(email) {
  if (!email || !allowedDomain) return false;
  const m = String(email).toLowerCase().match(/@([^@]+)$/);
  return !!m && m[1] === allowedDomain;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { SENDGRID_API_KEY } = process.env;
  if (!SENDGRID_API_KEY) return res.status(500).send("SENDGRID_API_KEY not set");
  if (!fallbackFrom) return res.status(500).send("SENDGRID_FROM not set");

  // parse body
  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const { quoteId, clientEmail, clientName, total, shareUrl, fromEmail, fromName, replyTo } = body;

  if (!quoteId) return res.status(400).send("quoteId required");
  if (!clientEmail) return res.status(400).send("clientEmail required");
  if (!shareUrl) return res.status(400).send("shareUrl required");

  // choose FROM: salesperson@valdicass.com if allowed, else fallback
  const chosenFromEmail = isAllowedFrom(fromEmail) ? fromEmail : fallbackFrom;
  const chosenFromName  = fromName || "Valdicass";

  sgMail.setApiKey(SENDGRID_API_KEY);

  const subject = `Your Valdicass estimate ${quoteId}`;
  const currency = (total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const msg = {
    to: clientEmail,
    from: { email: chosenFromEmail, name: chosenFromName },
    // reply-to: prefer salesperson (even if FROM fell back)
    ...(replyTo ? { replyTo: { email: replyTo, name: chosenFromName } } : {}),
    subject,
    text: `Hi ${clientName || "there"},
Your estimate ${quoteId} is ready:
${shareUrl}

Total: $${currency}

Thanks,
Valdicass`,
    html: `
      <p>Hi ${clientName || "there"},</p>
      <p>Your estimate <b>${quoteId}</b> is ready.</p>
      <p><a href="${shareUrl}" target="_blank">View your estimate</a></p>
      <p>Total: <b>$${currency}</b></p>
      <p>Thanks,<br/>Valdicass</p>
    `,
  };

  try {
    await sgMail.send(msg);
    return res.status(200).json({ ok: true, from: chosenFromEmail });
  } catch (err) {
    console.error("send-quote error:", err?.response?.body || err);
    return res.status(500).send(
      err?.response?.body ? JSON.stringify(err.response.body) : (err?.message || "Internal error")
    );
  }
}


