// src/ViewQuote.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { COMPANY } from "./companyInfo";
import valdicassLogo from "./assets/valdicass-logo.png";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig"; // adjust path
import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useRef } from "react";

const fn = httpsCallable(getFunctions(app), "createQuoteViewNotification");

export default function ViewQuote() {
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    const quoteId = new URLSearchParams(window.location.search).get("id");
    if (!quoteId) return;

    const functions = getFunctions(app, "us-central1"); // ← match deploy region
    const createQuoteViewNotification = httpsCallable(functions, "createQuoteViewNotification");

    createQuoteViewNotification({ quoteId })
      .catch((e) => console.error("Callable error:", e));
  }, []);
  return null; // your actual UI here
}


const firstRun = useRef(true);
useEffect(() => {
  if (firstRun.current) {
    firstRun.current = false;
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get("id");
    if (quoteId) logOpenAndNotify({ quoteId });
  }
}, []);

const toClientName = (v) => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const n = v.name || v.fullName || [v.firstName, v.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
  }
  return "";
};
const fmtDate = (d) => {
  try { const dt = d?.toDate ? d.toDate() : new Date(d); return dt.toLocaleDateString(); }
  catch { return ""; }
};
const fallbackNumber = (id = "") => (id ? id.slice(-6).toUpperCase() : "—");
const safeNum = (n) => (Number.isFinite(+n) ? +n : undefined);
const dim = (w, h) => (w || h) ? `${w || "?"}×${h || "?"}` : "";
const sameOrigin = (u) => {
  try { return new URL(u, window.location.href).origin === window.location.origin; }
  catch { return false; }
};
async function logOpenAndNotify({ quoteId }) {
  try {
    // 1) Load the quote to know who to notify
    const qRef = doc(db, "quotes", quoteId);
    const qSnap = await getDoc(qRef);
    if (!qSnap.exists()) return;

    const q = qSnap.data();
    const recipientId = q.createdBy; // salesperson UID
    const clientName = q.client?.name || "Client";
    const clientEmail = q.client?.email || "";

    // 2) Write to quoteLogs
    await addDoc(collection(db, "quoteLogs"), {
      quoteId,
      event: "OPENED",
      clientName,
      clientEmail,
      salespersonId: recipientId,
      at: serverTimestamp(),
    });

    // 3) Create a notification
    await addDoc(collection(db, "notifications"), {
      type: "QUOTE_VIEW",
      quoteId,
      recipientId,
      clientName,
      clientEmail,
      openedAt: serverTimestamp(),
      isRead: false,
    });
  } catch (e) {
    console.error("logOpenAndNotify error:", e);
  }
}
const goBack = () => {
  const cameFromApp = sameOrigin(document.referrer || "");
  // If there's in-app history, go back; otherwise, go to dashboard
  if (cameFromApp && window.history.length > 1) navigate(-1);
  else navigate("/dashboard");
};

/** Flatten possible { rooms: [{ name, items: [...] }]} into a single list */
const normalizeItems = (maybeRoomsOrItems) => {
  const arr = Array.isArray(maybeRoomsOrItems) ? maybeRoomsOrItems : [];
  if (!arr.length) return [];
  if (arr[0] && Array.isArray(arr[0].items)) {
    // rooms shape
    return arr.flatMap((room) =>
      (room.items || []).map((it) => ({ ...it, roomName: room.name || "" }))
    );
  }
  return arr; // already items
};

/** Build a nice one/two-line description for each item */
const buildItemText = (it, index) => {
  const parts = [];

  // Room/location first if present
  if (it.roomName || it.location) parts.push(it.roomName || it.location);

  // Type / Material / Series / Style
  const brand = [it.material, it.series].filter(Boolean).join(" ");
  if (it.type || brand || it.style) {
    parts.push([it.type, brand, it.style].filter(Boolean).join(" • "));
  }

  // Dimensions
  const size = dim(it.width, it.height);
  if (size) parts.push(size);

  // Colors (interior/exterior)
  if (it.colorInt || it.colorExt) {
    parts.push(`Int ${it.colorInt || "—"} / Ext ${it.colorExt || "—"}`);
  }

  // Install method / Venting
  if (it.installMethod) parts.push(`Install: ${it.installMethod}`);
  if (it.venting) parts.push(`Venting: ${it.venting}`);

  const title =
    it.title || it.name || it.desc || it.location || it.roomName || `Item ${index + 1}`;

  return {
    title,
    meta: parts.filter(Boolean).join(" • "),
    note: it.note || it.notes || "",
  };
};

export default function ViewQuote() {
  const navigate = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const id = params.get("id");

  const [q, setQ] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!id) { setLoading(false); return; }
      const snap = await getDoc(doc(db, "quotes", id));
      if (!stop) { setQ(snap.exists() ? { id: snap.id, ...snap.data() } : null); setLoading(false); }
    })();
    return () => { stop = true; };
  }, [id]);

  const clientName = useMemo(() => toClientName(q?.client), [q]);

  const items = useMemo(() => {
    const raw = q?.items ?? q?.rooms ?? [];
    return normalizeItems(raw);
  }, [q]);

  const subtotal = useMemo(() => {
    if (typeof q?.subtotal === "number") return q.subtotal;
    const sum = (items || []).reduce((acc, it) => {
      const qty = safeNum(it.qty ?? it.quantity) ?? 0;
      const unit = safeNum(it.unitPrice ?? it.price) ?? 0;
      const total = safeNum(it.total);
      return acc + (total ?? qty * unit);
    }, 0);
    return Math.max(0, sum);
  }, [q, items]);

  const taxRate = typeof q?.taxRate === "number" ? q.taxRate : 0.08;
  const tax = +(subtotal * taxRate).toFixed(2);
  const grand = typeof q?.total === "number" ? q.total : +(subtotal + tax).toFixed(2);

  // Sales rep snapshot (from quote)
  const rep = q?.preparedBy || q?.salesRep || {
    name: q?.preparedByName || "",
    email: q?.preparedByEmail || "",
    phone: q?.preparedByPhone || "",
  };

  const estNumber = q?.number || q?.estimateNumber || fallbackNumber(q?.id);

  return (
    <div className="vquote-root">
      <style>{CSS}</style>

   <div className="vq-actions no-print">
  <div className="left">
    <button className="btn ghost" onClick={goBack}>← Back</button>
  </div>
  <div className="right">
    <button className="btn" onClick={() => window.print()}>Download / Print PDF</button>
    {id && (
      <>
        <button className="btn primary" onClick={() => navigate(`/sign?id=${id}`)}>Sign & Accept</button>
        <button className="btn danger" onClick={() => navigate(`/decline?id=${id}`)}>Decline</button>
      </>
    )}
  </div>
</div>


      <article className="vq-page" id="printable">
        <header className="vq-header">
          <div className="brand">
            <div className="co-block">
              <img src={valdicassLogo} alt="Valdicass" className="co-logo" />
              <div className="co-name">{COMPANY.name}</div>
              <div className="co-line">{COMPANY.addressLine}</div>
              <div className="co-line">{COMPANY.officePhone} • {COMPANY.website}</div>
            </div>

            {(rep?.name || rep?.email || rep?.phone) && (
              <div className="rep-card">
                <div className="rep-title">Your Sales Representative</div>
                {rep?.name  && <div className="rep-line">{rep.name}</div>}
                {rep?.email && <div className="rep-line">{rep.email}</div>}
                {rep?.phone && <div className="rep-line">{rep.phone}</div>}
              </div>
            )}
          </div>

          <div className="invoice-meta">
            <div className="title">ESTIMATE</div>
            <table><tbody>
              <tr><td>Estimate #</td><td>{estNumber}</td></tr>
              <tr><td>Date</td><td>{fmtDate(q?.createdAt) || fmtDate(q?.date) || fmtDate(new Date())}</td></tr>
              {q?.po && <tr><td>PO #</td><td>{q.po}</td></tr>}
              <tr><td>Status</td><td>{q?.status || "Pending"}</td></tr>
            </tbody></table>
          </div>
        </header>

        <section className="row two">
          <div>
            <div className="h5">Prepared For</div>
            <div className="card">
              <div className="strong">{clientName || "Customer"}</div>
              <div>{q?.clientAddress || q?.location || "—"}</div>
              <div>{q?.clientPhone || " "}</div>
              <div>{q?.clientEmail || q?.email || " "}</div>
            </div>
          </div>
          <div>
            <div className="h5">Project</div>
            <div className="card">
              <div>{q?.projectName || q?.estimateName || "Estimate"}</div>
              <div>Prepared by: {rep?.name || "Valdicass Team"}</div>
            </div>
          </div>
        </section>

        <section>
          <div className="h5">Items</div>
          <table className="items">
            <thead>
              <tr>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num">Unit</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {(items.length ? items : [{ desc: "—", qty: "", price: "", total: "" }]).map((it, i) => {
                const { title, meta, note } = buildItemText(it, i);
                const qty = it.qty ?? it.quantity ?? "";
                const unit = it.unitPrice ?? it.price ?? "";
                const total = it.total ?? (safeNum(qty) && safeNum(unit) ? safeNum(qty) * safeNum(unit) : "");
                return (
                  <tr key={i}>
                    <td>
                      <div className="strong desc-title">{title}</div>
                      {meta && <div className="muted desc-meta">{meta}</div>}
                      {note && <div className="muted desc-note">{note}</div>}
                    </td>
                    <td className="num">{qty || ""}</td>
                    <td className="num">{fmtMoney(unit)}</td>
                    <td className="num">{fmtMoney(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="totals">
          <table><tbody>
            <tr><td>Subtotal</td><td className="num">{fmtMoney(subtotal)}</td></tr>
            <tr><td>Tax ({(taxRate*100).toFixed(0)}%)</td><td className="num">{fmtMoney(tax)}</td></tr>
            <tr className="grand"><td>Total</td><td className="num">{fmtMoney(grand)}</td></tr>
          </tbody></table>
        </section>

        <section className="sign-block">
          <div className="h5">Approval</div>
          <div className="sign-grid">
            <div className="line"><span>Customer Signature</span></div>
            <div className="line"><span>Date</span></div>
          </div>
        </section>

        {q?.signatureUrl && (
          <section style={{ marginTop: 12 }}>
            <div className="h5">Signature</div>
            <img src={q.signatureUrl} alt="Customer Signature" style={{ height: 60 }} />
          </section>
        )}
      </article>

      {loading && <div className="loading no-print">Loading…</div>}
      {!loading && !q && <div className="loading no-print">Quote not found.</div>}
    </div>
  );
}

function fmtMoney(v) {
  const n = Number(v);
  if (!isFinite(n)) return "";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const CSS = `
:root { --page-w: 8.5in; --page-h: 11in; --line: #e5e7eb; --text:#0f172a; --muted:#64748b; --brand:#0b63b2; }
*{box-sizing:border-box}
body{background:#f5f7fb;color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;margin:0;}
.vquote-root{min-height:100vh; padding:24px; display:grid; place-items:start center; gap:16px;}
.no-print{position:sticky; top:0;}
.vq-actions{display:flex; justify-content:space-between; align-items:center; gap:12px; width:min(100%, calc(var(--page-w) + 32px)); padding:8px 4px;}
.vq-actions .right{display:flex; gap:8px; align-items:center}
.btn{padding:10px 14px; border-radius:10px; border:1px solid var(--line); background:#fff; font-weight:700; cursor:pointer}
.btn.ghost{background:#fff}
.btn.primary{background:linear-gradient(135deg,var(--brand),#0a4b87); color:#fff; border:none}
.btn.danger{background:#fff5f6; color:#b4232a; border-color:#f3c7cc}

.vq-page{width:var(--page-w); background:#fff; min-height:var(--page-h); box-shadow:0 30px 80px rgba(2,29,78,.15); border:1px solid #eef2f7; padding:28px;}
.vq-header{display:flex; justify-content:space-between; gap:16px; border-bottom:2px solid var(--line); padding-bottom:12px; margin-bottom:16px}

/* Company block + logo */
.brand{display:flex; gap:12px; align-items:flex-start; max-width:60%;}
.co-block{display:flex; flex-direction:column}
.co-logo{width:72px; height:72px; object-fit:contain; margin-bottom:8px;}
.co-name{font-weight:800; font-size:18px}
.co-line{font-size:13px; color:#6b7280}

.rep-card{margin-top:8px; padding:8px 10px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px}
.rep-title{font-size:12px; font-weight:800; color:#475569; margin-bottom:4px}
.rep-line{font-size:13px; color:#0f172a}

.invoice-meta .title{font-weight:900; letter-spacing:.2em; color:#94a3b8; text-align:right}
.invoice-meta table{font-size:13px; color:#111827;}
.invoice-meta td:first-child{color:#6b7280; padding-right:10px;}

.row.two{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px}
.card{border:1px solid var(--line); border-radius:12px; padding:10px 12px; background:#fafafa}
.h5{font-weight:800; font-size:13px; color:#475569; margin-bottom:6px}
.mono{white-space:pre-wrap; font-family:ui-sans-serif; line-height:1.4}

.items{width:100%; border-collapse:collapse; margin-top:6px}
.items thead th{font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.04em; text-align:left; border-bottom:1px solid var(--line); padding:8px 6px}
.items tbody td{border-bottom:1px solid #f1f5f9; padding:10px 6px; vertical-align:top}
.items .num{text-align:right; width:120px}
.items .strong{font-weight:700}
.items .muted{font-size:12px; color:#64748b; margin-top:2px}
.desc-meta{margin-top:2px}
.desc-note{margin-top:4px; font-style:italic; color:#475569}

.totals{display:flex; justify-content:flex-end; margin-top:10px}
.totals table{min-width:320px}
.totals td{padding:6px 6px; border-bottom:1px solid #f1f5f9}
.totals .grand td{font-weight:900; border-bottom:2px solid var(--line)}

.sign-block{margin-top:18px}
.sign-grid{display:grid; grid-template-columns:2fr 1fr; gap:16px}
.sign-grid .line{border-bottom:2px solid #1f2937; height:42px; position:relative}
.sign-grid .line span{position:absolute; bottom:-18px; left:0; font-size:12px; color:#475569}

.loading{padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:12px; box-shadow:0 10px 30px rgba(2,29,78,.1)}

@media print {
  @page { size: letter portrait; margin: 0.5in; }
  body{background:#fff}
  .no-print, .btn{display:none !important}
  .vq-page{box-shadow:none; border:none; width:auto; min-height:auto; padding:0}
}
`;










