// src/QuotesPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, getDoc, deleteDoc, query, where } from "firebase/firestore";
import { getStorage, ref as sRef, deleteObject } from "firebase/storage";
import QuoteStatusPill from "./components/quotes/QuoteStatusPill";
import { renderAndUploadQuotePdf } from "./utils/renderAndUploadQuotePdf";
import { toast } from "react-toastify";

const VALID_FILTERS = ["all", "sent", "viewed", "signed", "declined"];
const ADMIN_UIDS = ["REuTGQ98bAM0riY9xidS8fW6obl2"]; // Admin UIDs

function fmt(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts;
    return d
      ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d)
      : "—";
  } catch {
    return "—";
  }
}

export default function QuotesPage() {
  const { filter = "all" } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(() => auth?.currentUser || null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
// track previous values to avoid spamming on initial load
const lastMapRef = useRef(new Map());
const initialRef = useRef(true);

  const isAdmin = !!user && ADMIN_UIDS.includes(user.uid);

  useEffect(() => {
    if (!VALID_FILTERS.includes(filter)) navigate("/quotes/all", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (!auth) return;
    const off = onAuthStateChanged(auth, setUser);
    return () => off();
  }, []);

  useEffect(() => {
  if (!user) return;
  setLoading(true);
  setErr("");

  const baseCol = collection(db, "quotes");
   // Admins see all; everyone else only their own docs
   const q = isAdmin ? baseCol : query(baseCol, where("createdBy", "==", user.uid));

   const off = onSnapshot(
     q,
    (snap) => {
      // ---- ADMIN LIVE TOASTS (after initial load only) ----
      if (isAdmin) {
        if (initialRef.current) {
          // prime the map on first snapshot so we don't fire toasts
          snap.docs.forEach((d) => lastMapRef.current.set(d.id, d.data()));
        } else {
          snap.docChanges().forEach((ch) => {
            const id = ch.doc.id;
            const cur = ch.doc.data() || {};
            const prev = lastMapRef.current.get(id) || {};

            if (ch.type === "modified") {
              if (!prev.viewed && cur.viewed)   toast.info(`👀 Viewed — ${cur.client?.name || id}`);
              if (!prev.signed && cur.signed)   toast.success(`✅ Signed — ${cur.client?.name || id}`);
              if (!prev.declined && cur.declined) toast.warn(`❌ Declined — ${cur.client?.name || id}`);
            } else if (ch.type === "removed") {
              // show who was deleted if we still have prev
              toast.warn(`🗑️ Deleted — ${prev.client?.name || id}`);
              lastMapRef.current.delete(id);
              return; // nothing else to update for this change
            }

            // keep map current for added/modified
            lastMapRef.current.set(id, cur);
          });
        }
        initialRef.current = false;
      }

      // ---- your existing filtering/sorting pipeline ----
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const mineOrAll = all.filter((q) => {
        if (isAdmin) return true; // admins see everything
        const owner = q.createdBy || q.userId || null;
        return owner === user.uid;
      });

      const rows = mineOrAll.filter((q) => {
        const st = (q.status || "").toLowerCase();
        const isViewed   = q.viewed === true   || st === "viewed";
        const isSigned   = q.signed === true   || st === "signed";
        const isDeclined = q.declined === true || st === "declined";
        const isSent     = st === "sent" || (!isViewed && !isSigned && !isDeclined);

        switch (filter) {
          case "viewed":   return isViewed;
          case "signed":   return isSigned;
          case "declined": return isDeclined;
          case "sent":     return isSent;
          case "all":
          default:         return true;
        }
      });

      rows.sort((a, b) => (b?.createdAt?.seconds || 0) - (a?.createdAt?.seconds || 0));
      setQuotes(rows);
      setLoading(false);
    },
    (e) => {
      console.error(e);
      setErr("Failed to load quotes.");
      setLoading(false);
    }
  );

  return () => off();
}, [user, filter, isAdmin]);


  const title = useMemo(() => {
    const s = filter[0].toUpperCase() + filter.slice(1);
    return s === "All" ? "All Quotes" : `${s} Quotes`;
  }, [filter]);

  const baseUrl = window.location.origin.replace(/\/$/, "");

  async function handleSavePdfFor(id) {
    try {
      setSavingId(id);
      const snap = await getDoc(doc(db, "quotes", id));
      if (!snap.exists()) {
        toast.error("Quote not found");
        return;
      }
      const quote = { id, ...snap.data() };
      const url = await renderAndUploadQuotePdf(quote, id);
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, pdfUrl: url } : q)));
      toast.success("PDF saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save PDF");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id, ownerName, total) {
  const prettyTotal = typeof total === "number" ? `$${Number(total).toLocaleString()}` : "";
  const ok = window.confirm(
    `Delete this quote for ${ownerName || "client"} ${prettyTotal ? `(${prettyTotal})` : ""}?\nThis cannot be undone.`
  );
  if (!ok) return;

  try {
    setDeletingId(id);
    const res = await fetch("/api/delete-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId: id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) throw new Error(json?.error || `Failed (${res.status})`);
    toast.success("Quote deleted");
  } catch (e) {
    console.error(e);
    toast.error("Failed to delete quote");
  } finally {
    setDeletingId(null);
  }
}


  if (!user) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Please sign in to view your quotes.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      {/* Title + filter chips + admin/back */}
      <header style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>{title}</h1>

          <nav style={filtersWrap}>
            {VALID_FILTERS.map((f) => {
              const label = f[0].toUpperCase() + f.slice(1);
              const active = f === filter;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => navigate(`/quotes/${f}`)}
                  style={{ ...chip, ...(active ? chipActive : null) }}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {!!isAdmin && (
              <span
                title="Admin mode — viewing all users' quotes"
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#eef2ff",
                  color: "#3730a3",
                  fontWeight: 700,
                  fontSize: 12,
                  border: "1px solid #c7d2fe",
                }}
              >
                ADMIN — All users
              </span>
            )}
            <Link to="/dashboard" style={{ textDecoration: "none" }}>← Back to Dashboard</Link>
          </div>
        </div>
      </header>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : quotes.length === 0 ? (
        <div>No quotes found for <strong>{filter}</strong>.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={th}>Date</th>
                <th style={th}>Client</th>
                <th style={th}>Email</th>
                <th style={th}>Total</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const isOwner = (q.createdBy || q.userId) === user.uid;
                const canDelete = isAdmin || isOwner;
                const hasPdf = !!q.pdfUrl;

                return (
                  <tr key={q.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={td}>{fmt(q.createdAt)}</td>
                    <td style={td}>{q.client?.name || "—"}</td>
                    <td style={td}>{q.client?.clientEmail || "—"}</td>
                    <td style={td}>${Number(q.total || 0).toLocaleString()}</td>
                    <td style={td}><QuoteStatusPill quoteId={q.id} showMeta={false} /></td>

                    {/* Toolbar-style actions */}
                    <td style={{ ...td, textAlign: "right" }}>
                      <div style={actionBar}>
                        {/* Primary group */}
                        <div style={group}>
                          <a
                            href={`${baseUrl}/view-quote?id=${q.id}`}
                            target="_blank"
                            rel="noreferrer"
                            style={btnGhost}
                            title="Open quote"
                          >
                            Open
                          </a>

                          {hasPdf ? (
                            <a
                              href={q.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={btnPrimary}
                              title="Open saved PDF"
                            >
                              Open PDF
                            </a>
                          ) : (
                            <button
                              onClick={() => handleSavePdfFor(q.id)}
                              disabled={savingId === q.id}
                              style={btnPrimary}
                              title="Render & upload PDF"
                            >
                              {savingId === q.id ? "Saving…" : "Save PDF"}
                            </button>
                          )}
                        </div>

                        {/* Utilities group */}
                        <div style={group}>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(`${baseUrl}/view-quote?id=${q.id}`)
                            }
                            style={btnGhost}
                            title="Copy client link"
                          >
                            Copy
                          </button>

                          {!(q.signed || q.declined || q.status === "signed" || q.status === "declined") && (
                            <>
                              <a
                                href={`${baseUrl}/sign?id=${q.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={btnGhost}
                                title="Client sign"
                              >
                                Sign
                              </a>
                              <a
                                href={`${baseUrl}/decline?id=${q.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={btnWarn}
                                title="Client decline"
                              >
                                Decline
                              </a>
                            </>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDelete(q.id, q.client?.name, q.total)}
                              disabled={deletingId === q.id}
                              style={btnDanger}
                              title="Delete quote"
                            >
                              {deletingId === q.id ? "Deleting…" : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Table cells */
const th = { textAlign: "left", padding: "10px 8px", fontWeight: 700, fontSize: 14, color: "#374151" };
const td = { padding: "10px 8px", fontSize: 14 };

/* Top filter chips */
const filtersWrap = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "nowrap",
  overflowX: "auto",
  paddingBottom: 2,
};
const chip = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 28,
  lineHeight: "28px",
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};
const chipActive = { background: "#0b5fff", borderColor: "#0b5fff", color: "#fff" };

/* Row action toolbar */
const actionBar = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  alignItems: "center",
  flexWrap: "wrap",
};

const group = {
  display: "inline-flex",
  gap: 6,
  padding: 4,
  background: "#f3f4f6",           // gray-100
  border: "1px solid #e5e7eb",     // gray-200
  borderRadius: 999,
};

/* Buttons */
const baseBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 32,
  lineHeight: "32px",
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid transparent",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
  background: "transparent",
  color: "#111827",
};

const btnGhost  = { ...baseBtn, background: "#fff", borderColor: "#e5e7eb" };
const btnPrimary= { ...baseBtn, background: "#0b5fff", borderColor: "#0b5fff", color: "#fff" };
const btnWarn   = { ...baseBtn, background: "#fff", borderColor: "#fde68a", color: "#92400e" };  // amber outline
const btnDanger = { ...baseBtn, background: "#fff", borderColor: "#fecaca", color: "#991b1b" };  // red outline













