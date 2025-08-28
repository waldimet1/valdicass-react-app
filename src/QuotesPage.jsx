// src/QuotesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { auth, db } from "./firebaseConfig"; // unified import
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import QuoteStatusPill from "/components/quotes/QuoteStatusPill";
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
  const [savingId, setSavingId] = useState(null); // track per-row save

  const isAdmin = !!user && ADMIN_UIDS.includes(user.uid);

  // Guard bad URLs like /quotes/foo
  useEffect(() => {
    if (!VALID_FILTERS.includes(filter)) navigate("/quotes/all", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Keep auth state in sync
  useEffect(() => {
    if (!auth) return;
    const off = onAuthStateChanged(auth, setUser);
    return () => off();
  }, []);

  // Single listener to ALL quotes; then client-side filter for ownership + category
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setErr("");

    const off = onSnapshot(
      collection(db, "quotes"),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // 1) Ownership filter
        const mineOrAll = all.filter((q) => {
          if (isAdmin) return true; // admins see everything
          const owner = q.createdBy || q.userId || null; // tolerate legacy/missing
          return owner === user.uid;
        });

        // 2) Category filter (support both schemas)
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

        // newest first
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

  // Save PDF for a single row
  async function handleSavePdfFor(id) {
    try {
      setSavingId(id);
      const snap = await getDoc(doc(db, "quotes", id));
      if (!snap.exists()) {
        toast.error("Quote not found");
        return;
      }
      const quote = { id, ...snap.data() };
      const url = await renderAndUploadQuotePdf(quote, id); // uploads to quotes/{id}/quote.pdf
      setQuotes((prev) => prev.map((q) => (q.id === id ? { ...q, pdfUrl: url } : q)));
      toast.success("PDF saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save PDF");
    } finally {
      setSavingId(null);
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
      <header style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, marginRight: 12 }}>{title}</h1>

        {VALID_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => navigate(`/quotes/${f}`)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: f === filter ? "#0b5fff" : "#fff",
              color: f === filter ? "#fff" : "#111827",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {isAdmin && (
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
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>{fmt(q.createdAt)}</td>
                  <td style={td}>{q.client?.name || "—"}</td>
                  <td style={td}>{q.client?.clientEmail || "—"}</td>
                  <td style={td}>${Number(q.total || 0).toLocaleString()}</td>
                  <td style={td}><QuoteStatusPill quoteId={q.id} showMeta={false} /></td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a href={`${baseUrl}/view-quote?id=${q.id}`} target="_blank" rel="noreferrer" style={btnLink}>
                        Open
                      </a>

                      {/* NEW: Save PDF button */}
                      <button
                        onClick={() => handleSavePdfFor(q.id)}
                        disabled={savingId === q.id}
                        style={btn}
                        title="Render & upload PDF"
                      >
                        {savingId === q.id ? "Saving…" : "Save PDF"}
                      </button>

                      {/* NEW: Open PDF link if exists */}
                      {q.pdfUrl && (
                        <a href={q.pdfUrl} target="_blank" rel="noreferrer" style={btnLink}>
                          Open PDF
                        </a>
                      )}

                      <button
                        onClick={() => navigator.clipboard.writeText(`${baseUrl}/view-quote?id=${q.id}`)}
                        style={btn}
                        title="Copy client link"
                      >
                        Copy Link
                      </button>

                      {!(q.signed || q.declined || q.status === "signed" || q.status === "declined") && (
                        <>
                          <a href={`${baseUrl}/sign?id=${q.id}`} target="_blank" rel="noreferrer" style={btnLink}>
                            Sign
                          </a>
                          <a href={`${baseUrl}/decline?id=${q.id}`} target="_blank" rel="noreferrer" style={btnLinkRed}>
                            Decline
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { textAlign: "left", padding: "10px 8px", fontWeight: 700, fontSize: 14, color: "#374151" };
const td = { padding: "10px 8px", fontSize: 14 };
const btn = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};
const btnLink = { ...btn, textDecoration: "none", display: "inline-block" };
const btnLinkRed = { ...btnLink, borderColor: "#fecaca", background: "#fee2e2" };







