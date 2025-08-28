// src/features/quotes/lib/quoteNaming.js

/**
 * Build a friendly quote name like:
 * "Walter Skura — Aug 27 — $15,325"
 */
export function makeQuoteDisplayName({ clientName, city, createdAt, total }) {
  const who = (clientName || "Customer").trim();
  const when =
    createdAt instanceof Date
      ? createdAt
      : createdAt?.toDate?.() instanceof Date
      ? createdAt.toDate()
      : new Date();
  const whenStr = when.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  const loc = city ? ` • ${city}` : "";
  const money =
    typeof total === "number" && Number.isFinite(total)
      ? ` — $${Number(total).toLocaleString()}`
      : "";
  return `${who}${loc} — ${whenStr}${money}`;
}

/**
 * Normalize creator fields from Firebase Auth user
 */
export function creatorFromUser(user) {
  return {
    createdBy: user?.uid || null,
    createdByName: user?.displayName || user?.email || "Unknown",
    createdByEmail: user?.email || null,
  };
}
