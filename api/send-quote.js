import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { quoteId, clientEmail, clientName = "Customer", total = 0, shareUrl } = req.body || {};
    if (!quoteId || !shareUrl) return res.status(400).json({ error: "Missing quoteId or shareUrl" });

    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({ error: "SENDGRID_API_KEY not set" });
    }

    await sgMail.send({
      to: clientEmail,
      from: process.env.SENDGRID_FROM || "no-reply@valdicass.com",
      subject: `Your Valdicass Quote ${quoteId}`,
      html: `
        <div style="font-family:system-ui,Arial,sans-serif">
          <h2>Hi ${clientName}, your quote is ready</h2>
          <p>Total: <b>$${Number(total).toLocaleString()}</b></p>
          <p><a href="${shareUrl}">View your quote</a></p>
        </div>
      `,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Send failed" });
  }
}
