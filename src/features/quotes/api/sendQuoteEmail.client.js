import { http } from "@/services/httpClient";

export async function sendQuoteEmail({ quoteId, clientEmail, clientName, total, shareUrl, createdBy }) {
  return http("/sendQuoteEmail", {
    method: "POST",
    body: { quoteId, clientEmail, clientName, total, shareUrl, createdBy },
  });
}

export async function health() {
  try {
    const res = await http("/health", { method: "GET" });
    return { ok: true, res };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
