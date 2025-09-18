// api/_lib/notifyAdmin.js
export async function notifyAdmin(subject, html) {
  try {
    const mod = await import("@sendgrid/mail");
    const sg = mod.default || mod;
    const KEY = process.env.SENDGRID_API_KEY;
    const FROM = process.env.EMAIL_FROM || "quotes@valdicass.com";
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

    if (!KEY || ADMIN_EMAILS.length === 0) return;
    sg.setApiKey(KEY);

    await sg.send({
      to: ADMIN_EMAILS,
      from: { email: FROM, name: "Valdicass" },
      subject,
      html,
    }, false);
  } catch (e) {
    console.error("notifyAdmin error:", e?.response?.body || e);
  }
}
