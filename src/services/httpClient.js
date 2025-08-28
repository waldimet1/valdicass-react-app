import { ENV } from "@/services/env";

export async function http(path, { method = "GET", headers = {}, body } = {}) {
  const url = `${ENV.API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const init = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  };
  const res = await fetch(url, init);

  let payload = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    payload = await res.json().catch(() => null);
  } else {
    payload = await res.text().catch(() => null);
  }
  if (!res.ok) {
    const msg = typeof payload === "string" ? payload : (payload?.error || JSON.stringify(payload));
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${msg || "Unknown error"}`);
  }
  return payload;
}
