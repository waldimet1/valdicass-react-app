// src/pages/QuoteDashboardModern.jsx
import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, ChevronDown, Eye, Send, Edit, Trash2, FileText,
  CheckCircle2, Clock, DollarSign, Users, BarChart3, LayoutGrid,
  CheckSquare, Clock3, Settings, Sun, Moon,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, onSnapshot, query as fsQuery, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import valdicassLogo from "../assets/valdicass-logo.png";
import TopbarGuard from "../components/TopbarGuard";
import blueprintBg from "../assets/blueprint-bg.png";
import NotificationBell from "../components/NotificationBell";


/**
 * Valdicass Quote Dashboard — Modern v2
 */

const SEND_ENDPOINT = import.meta.env.VITE_SENDQUOTE_ENDPOINT || "/api/sendQuoteEmail";

const SAMPLE_QUOTES = [
  { id: "Q-10247", client: "Heather M.", location: "La Grange, IL", createdAt: "2025-08-28", total: 14872.0, status: "Viewed", items: 6 },
  { id: "Q-10246", client: "Jordan M.", location: "Downers Grove, IL", createdAt: "2025-08-26", total: 9325.5, status: "Sent", items: 3 },
  { id: "Q-10233", client: "Alicia R.", location: "Elmwood Park, IL", createdAt: "2025-08-19", total: 21790.0, status: "Signed", items: 9 },
  { id: "Q-10212", client: "Brian C.", location: "Naperville, IL", createdAt: "2025-08-10", total: 12540.0, status: "Pending", items: 4 },
  { id: "Q-10198", client: "Maria & Tom", location: "Forest Park, IL", createdAt: "2025-08-03", total: 18430.0, status: "Declined", items: 5 },
];

const STATUS_COLORS = {
  Sent: "var(--pill-sent)",
  Viewed: "var(--pill-viewed)",
  Pending: "var(--pill-pending)",
  Signed: "var(--pill-signed)",
  Declined: "var(--pill-declined)",
};

// helpers
const getTime = (d) => (d?.toDate ? d.toDate().getTime() : new Date(d).getTime());
const fmtDate = (d) => { try { const dt = d?.toDate ? d.toDate() : new Date(d); return dt.toLocaleDateString(); } catch { return ""; } };
const toClientName = (v) => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const name = v.name || v.fullName || [v.firstName, v.lastName].filter(Boolean).join(" ").trim();
    if (name) return name;
  }
  return "";
};

export default function QuoteDashboardModern({ user }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [dark, setDark] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const goto = (path) => () => navigate(path);
  const isActive = (path) => pathname === path || pathname.startsWith(path + "/");

  // theme toggle
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("vd-dark");
    else root.classList.remove("vd-dark");
  }, [dark]);

  // Firestore live list
  useEffect(() => {
    const qRef = fsQuery(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qRef, (snap) => {
      setQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // nav + actions
  const gotoNew = () => navigate("/new");                    // create
  const gotoView = (id) => navigate(`/view-quote?id=${id}`); // read-only/PDF view
  const gotoEdit = (id) => navigate(`/estimate?id=${id}`);   // edit form

  const resendQuote = async (row) => {
    try {
      const shareUrl = `${window.location.origin}/view-quote?id=${row.id}`;
      const payload = {
        quoteId: row.id,
        clientEmail: row.clientEmail || row.email || "",
        clientName: toClientName(row.client) || "Customer",
        total: row.total || 0,
        shareUrl,
      };
      const res = await fetch(SEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      alert(`Quote ${row.id} re-sent${payload.clientEmail ? ` to ${payload.clientEmail}` : ""}.`);
    } catch (err) {
      alert(`Failed to resend: ${err.message}`);
    }
  };

  const deleteQuote = async (id) => {
    if (!window.confirm(`Delete ${id}? This cannot be undone.`)) return;
    try { await deleteDoc(doc(db, "quotes", id)); }
    catch (err) { alert(`Delete failed: ${err.message}`); }
  };

  // filtered/sorted rows
  const data = useMemo(() => {
    let rows = quotes.length ? [...quotes] : [...SAMPLE_QUOTES];

    if (status !== "All") rows = rows.filter((r) => r.status === status);

    if (query.trim()) {
      const qstr = query.toLowerCase();
      rows = rows.filter((r) => {
        const client = toClientName(r.client).toLowerCase();
        const loc = String(r.location || "").toLowerCase();
        const idv = String(r.id || "").toLowerCase();
        return client.includes(qstr) || loc.includes(qstr) || idv.includes(qstr);
      });
    }

    rows.sort((a, b) => {
      if (sort === "Newest") return getTime(b.createdAt) - getTime(a.createdAt);
      if (sort === "Oldest") return getTime(a.createdAt) - getTime(b.createdAt);
      if (sort === "Highest $") return (b.total || 0) - (a.total || 0);
      if (sort === "Lowest $") return (a.total || 0) - (b.total || 0);
      return 0;
    });
    return rows;
  }, [query, status, sort, quotes]);

  // quick totals
  const totals = useMemo(() => {
    const rowsAll = quotes.length ? quotes : SAMPLE_QUOTES;
    const viewed = rowsAll.filter((q) => q.status === "Viewed").length;
    const signed = rowsAll.filter((q) => q.status === "Signed").length;
    const pending = rowsAll.filter((q) => q.status === "Pending").length;
    return { all: rowsAll.length, viewed, signed, pending };
  }, [quotes]);

  return (
    <div className="md-root">
      <style>{CSS}</style>

      {/* Left rail */}
      <aside className="md-rail">
        <div
          className="md-logo"
          title="Dashboard"
          role="button"
          onClick={goto("/dashboard")}
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <img src={valdicassLogo} alt="Valdicass" />
        </div>

        <nav className="md-nav" aria-label="Primary">
          <button
            className={`rail-btn ${isActive("/dashboard") ? "active" : ""}`}
            title="Dashboard"
            aria-current={isActive("/dashboard") ? "page" : undefined}
            onClick={goto("/dashboard")}
          >
            <LayoutGrid size={18} />
          </button>

          <button
            className={`rail-btn ${isActive("/quotes") ? "active" : ""}`}
            title="Quotes"
            aria-current={isActive("/quotes") ? "page" : undefined}
            onClick={goto("/quotes/all")}
          >
            <FileText size={18} />
          </button>

          <button
            className={`rail-btn ${isActive("/in-progress") ? "active" : ""}`}
            title="In progress"
            aria-current={isActive("/in-progress") ? "page" : undefined}
            onClick={goto("/quotes/pending")}
          >
            <Clock3 size={18} />
          </button>

          <button
            className={`rail-btn ${isActive("/signed") ? "active" : ""}`}
            title="Signed"
            aria-current={isActive("/signed") ? "page" : undefined}
            onClick={goto("/quotes/signed")}
          >
            <CheckSquare size={18} />
          </button>

          <button
            className={`rail-btn ${isActive("/reports") ? "active" : ""}`}
            title="Reports"
            aria-current={isActive("/reports") ? "page" : undefined}
            onClick={goto("/reports")}
          >
            <BarChart3 size={18} />
          </button>
        </nav>

        <div className="md-rail-bottom">
          <button
            className={`rail-btn ${isActive("/settings") ? "active" : ""}`}
            title="Settings"
            aria-current={isActive("/settings") ? "page" : undefined}
            onClick={goto("/settings")}
          >
            <Settings size={18} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md-main">
        {/* ✅ Wrap the sticky header with TopbarGuard so a spacer is added automatically */}
        <TopbarGuard>
          <header className="md-topbar">
            <div className="md-title">
              <h1>Quotes</h1>
              <p>Manage proposals and track customer progress</p>
            </div>
            <div className="md-top-actions">
              {user && <NotificationBell user={user} />}
              <button className="btn ghost" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
                <span className="hide-sm">Theme</span>
              </button>
              <button className="btn primary" onClick={gotoNew}>
                <Plus size={18} />
                <span className="hide-sm">New Quote</span>
              </button>
            </div>
          </header>
        </TopbarGuard>

        <section className="md-controls">
          <div className="md-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client, location, or Quote ID…"
              aria-label="Search quotes"
            />
          </div>
         <div className="md-chips compact" role="tablist" aria-label="Filter by status">
<div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
  {user && <NotificationBell user={user} />}
</div>

            {["All", "Sent", "Viewed", "Pending", "Signed", "Declined"].map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={status === s}
                onClick={() => setStatus(s)}
                className={`chip ${status === s ? "active" : ""}`}
                style={{ "--chip-color": STATUS_COLORS[s] || "var(--muted)" }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="md-sort">
            <span>Sort</span>
            <div className="select-wrap">
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort quotes">
                <option>Newest</option>
                <option>Oldest</option>
                <option>Highest $</option>
                <option>Lowest $</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
        </section>

        {/* Micro stats */}
        <section className="md-stats">
          <MiniStat icon={<FileText />} label="Total" value={totals.all} />
          <MiniStat icon={<Eye />} label="Viewed" value={totals.viewed} />
          <MiniStat icon={<CheckCircle2 />} label="Signed" value={totals.signed} />
          <MiniStat icon={<Clock />} label="Pending" value={totals.pending} />
        </section>

        {/* List-style modern cards */}
        <section className="md-list">
          {data.length === 0 ? (
            <EmptyStateModern onNew={gotoNew} />
          ) : (
            data.map((row) => (
              <RowCard
                key={row.id}
                quote={row}
                onView={gotoView}
                onEdit={gotoEdit}
                onResend={resendQuote}
                onDelete={deleteQuote}
              />
            ))
          )}
        </section>

        {/* Floating action button */}
        <button className="fab" onClick={gotoNew} aria-label="Create new quote">
          <Plus size={22} />
        </button>
      </main>
    </div>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <motion.div className="mini" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="mini-icn">{icon}</div>
      <div className="mini-meta">
        <div className="mini-label">{label}</div>
        <div className="mini-value">{value}</div>
      </div>
    </motion.div>
  );
}

function RowCard({ quote, onView, onEdit, onResend, onDelete }) {
  const pillColor = STATUS_COLORS[quote.status] || "var(--muted)";
  const clientName = toClientName(quote.client);
  const initial = (clientName.trim()[0] || "?").toUpperCase();

  return (
    <motion.article className="row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="row-accent" style={{ background: pillColor }} />
      <div className="row-main">
        <div className="row-left">
          <div className="row-avatar">{initial}</div>
          <div className="row-info">
            <div className="row-client">
              {clientName || "—"}
              {quote.number && (
                <span style={{ marginLeft: 8, color: "var(--muted)", fontWeight: 500 }}>
                  • #{quote.number}
                </span>
              )}
            </div>
            <div className="row-meta">
              <span>{String(quote.location || "—")}</span>
              <span aria-hidden>•</span>
              <span>{fmtDate(quote.createdAt)}</span>
              <span aria-hidden>•</span>
              <span>{quote.items ?? 0} items</span>
            </div>
          </div>
        </div>
        <div className="row-right">
          <div className="row-amount" title="Quote total">
            <DollarSign size={16} /> {(quote.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="row-pill" style={{ color: pillColor, borderColor: pillColor }}>{quote.status}</span>
          <div className="row-actions">
            <button className="icon icon-view"   onClick={() => onView(quote.id)}   title="View"><Eye size={16} /></button>
            <button className="icon icon-send"   onClick={() => onResend(quote)}     title="Resend"><Send size={16} /></button>
            <button className="icon icon-edit"   onClick={() => onEdit(quote.id)}    title="Edit"><Edit size={16} /></button>
            <button className="icon icon-danger" onClick={() => onDelete(quote.id)}  title="Delete"><Trash2 size={16} /></button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyStateModern({ onNew }) {
  return (
    <div className="md-empty">
      <div className="md-empty-icn"><Users /></div>
      <h3>No results</h3>
      <p>Try adjusting filters or create your next quote.</p>
      <button className="btn primary" onClick={onNew}><Plus size={18}/> New Quote</button>
    </div>
  );
}

const CSS = `
/* ---- tokens ---- */
:root {
  --rail-w: 84px;
  --brand-badge-bg:  #0b63b2;   /* primary */
  --brand-badge-bg2: #0a4b87;   /* deeper */
  --brand-badge-ring:#ffffff;   /* outer ring */
}
  --brand: #add6fbff;
  --accent: #ff7a00;
  --bg: #f5f7fb;
  --panel: rgba(255,255,255,0.7);
  --line: rgba(10, 20, 40, 0.12);
  --text: #0f172a;
  --muted: #6b7280;
  --soft: rgba(12, 20, 40, 0.06);
  --shadow: 0 20px 40px rgba(2,29,78,0.12);

  /* Action colors */
  --act-view-fg:#1b4ed1; --act-view-bg:#eaf2ff; --act-view-br:#cfe1ff;
  --act-send-fg:#b65a05; --act-send-bg:#fff3e8; --act-send-br:#ffdcbf;
  --act-edit-fg:#6d28d9; --act-edit-bg:#f3e8ff; --act-edit-br:#e3d0ff;
  --act-del-fg:#b4232a;  --act-del-bg:#fff2f3; --act-del-br:#ffd6db;

  --pill-sent: #4169e1;
  --pill-viewed: #0a7a66;
  --pill-pending: #9a6700;
  --pill-signed: #067647;
  --pill-declined: #b4232a;
}
@media (max-width: 860px) { :root { --rail-w: 64px; } }

.vd-dark:root {
  --bg: #0b1220;
  --panel: rgba(18, 25, 40, 0.55);
  --line: rgba(255,255,255,0.08);
  --text: #eaf0ff;
  --muted: #94a3b8;
  --soft: rgba(255,255,255,0.04);
  --shadow: 0 30px 60px rgba(0,0,0,0.35);
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  color: var(--text);

  /* Image background + soft overlay to keep cards/labels readable */
  background-image:
    linear-gradient(rgba(255,255,255,0.88), rgba(255,255,255,0.88)),
    url(${blueprintBg});
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

/* Dark theme uses a darker overlay on the same image */
.vd-dark body {
  background-image:
    linear-gradient(rgba(11,18,32,0.90), rgba(11,18,32,0.90)),
    url(${blueprintBg});
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}


.md-root { display: grid; grid-template-columns: 84px 1fr; gap: 0; min-height: 100vh; }

/* Left rail */
.md-rail {
  position: sticky; top: 0; height: 100vh;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  padding: 18px 12px; backdrop-filter: blur(14px);
  background: var(--panel); border-right: 1px solid var(--line);
}
.md-logo {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--brand-badge-bg), var(--brand-badge-bg2));
  border: 2px solid var(--brand-badge-ring);          /* crisp white ring */
  box-shadow:
    0 10px 24px rgba(2, 29, 78, 0.25),                /* depth */
    0 0 0 4px rgba(11, 99, 178, 0.10);                /* soft brand halo */
}
.md-logo img { width: 100%; height: 100%; object-fit: contain; }
.md-nav { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.rail-btn { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; border: 1px solid var(--line); background: rgba(255,255,255,0.6); color: var(--text); cursor: pointer; transition: transform .12s ease, background .12s ease; }
.vd-dark .rail-btn { background: rgba(255,255,255,0.05); }
.rail-btn:hover { transform: translateY(-1px); }
.rail-btn.active { outline: 2px solid var(--brand); }
.md-rail-bottom { margin-top: auto; }
.vd-dark .md-logo {
  border-color: rgba(255,255,255,0.35);
  box-shadow:
    0 10px 24px rgba(0,0,0,0.45),
    0 0 0 4px rgba(255,255,255,0.08);
}
/* Main */
.md-main { padding: 16px 24px 100px; }

/* Sticky header; TopbarGuard sets --topbar-h and renders a spacer under it */
/* Push the first section below the sticky header on ALL pages that use .md-topbar */
.md-topbar + * { margin-top: calc(var(--topbar-h, 80px) + 8px); }

/* Optional but nice: anchor jumps won’t hide under the bar */
html { scroll-padding-top: calc(var(--topbar-h, 80px) + 8px); }

.md-topbar{
  position: sticky;
  top: 0;
  z-index: 40;
  background: #fff;
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
}
.vd-dark .md-topbar{ background: #0f172a; }

/* Keep content in normal stacking context */
.md-controls, .md-stats, .md-list { position: relative; z-index: 0; }

/* Global scroll anchoring so in-page jumps don’t hide under the header */
html { scroll-padding-top: calc(var(--topbar-h, 80px) + 8px); }

.md-title h1 { margin: 0; font-size: 22px; }
.md-title p { margin: 2px 0 0; color: var(--muted); font-size: 13px; }
.md-top-actions { display: flex; gap: 10px; align-items: center; }

/* Controls */
/* before: grid-template-columns: 1fr auto auto; */
.md-controls { grid-template-columns: minmax(240px,1fr) minmax(340px,1fr) auto; }
.md-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--line); background: var(--panel); backdrop-filter: blur(8px); }
.md-search input { border: none; outline: none; background: transparent; font-size: 14px; color: var(--text); width: 100%; }
/* Compact, single-line chips row */
.md-chips.compact{
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;                 /* keep one line */
  overflow-x: auto;                  /* scroll if it overflows */
  -webkit-overflow-scrolling: touch; /* smooth on iOS */
  white-space: nowrap;
  padding: 2px 2px 4px;              /* tiny bottom so scrollbar never shows */
  border-radius: 10px;
}
.md-chips.compact::-webkit-scrollbar { height: 0; } /* hide scrollbar in WebKit */
.md-chips.compact { scrollbar-width: none; }        /* hide in Firefox */

/* Smaller pills */
.chip{
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 8px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  cursor: pointer;
}
.chip.active{
  color: var(--text);
  box-shadow: inset 0 0 0 1.5px var(--chip-color);
  background: rgba(11,99,178,0.05);
}
/* === Compact, single-row chips with blue hover ============================ */
:root { --chip-hover: #2C84E0; }

.md-chips.compact{
  display: flex !important;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;                 /* single row */
  overflow-x: auto;                  /* scroll if too many */
  -webkit-overflow-scrolling: touch; /* smooth on iOS */
  white-space: nowrap;
  padding: 2px 2px 4px;
  border-radius: 10px;
}

.md-chips.compact::-webkit-scrollbar { height: 0; }
.md-chips.compact { scrollbar-width: none; }

/* Make sure each chip stays inline and doesn’t stretch full width */
.md-chips.compact .chip{
  display: inline-flex !important;
  width: auto !important;
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  line-height: 28px;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  cursor: pointer;
  transition: background .12s ease, color .12s ease, border-color .12s ease;
}

/* Active state stays outlined but readable */
.md-chips.compact .chip.active{
  color: var(--text);
  box-shadow: inset 0 0 0 1.5px var(--chip-color);
  background: rgba(44,132,224,0.06); /* faint fill */
}

/* Hover → Valdicass blue */
.md-chips.compact .chip:hover{
  background: var(--chip-hover);
  border-color: var(--chip-hover);
  color: #fff;
}

/* Optional (gives them a little hover feedback) */
.chip:hover{ background: rgba(15,23,42,0.03); }

.md-sort { display: flex; align-items: center; gap: 8px; }
.select-wrap { position: relative; display: flex; align-items: center; gap: 8px; border: 1px solid var(--line); background: var(--panel); padding: 8px 10px; border-radius: 12px; }
.select-wrap select { appearance: none; border: none; outline: none; background: transparent; color: var(--text); font-size: 13px; padding-right: 16px; }
.select-wrap svg { position: absolute; right: 8px; }

/* Mini stats */
.md-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 10px; }
.mini { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--line); background: var(--panel); backdrop-filter: blur(10px); }
.mini-icn { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--soft); color: var(--brand); }
.mini-label { font-size: 12px; color: var(--muted); }
.mini-value { font-weight: 800; font-size: 18px; }

/* List */
.md-list { display: grid; gap: 10px; }
.row { position: relative; display: flex; border: 1px solid var(--line); border-radius: 18px; background: var(--panel); backdrop-filter: blur(8px); overflow: hidden; transition: transform .16s ease, box-shadow .16s ease; }
.row:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.row-accent { width: 4px; }
.row-main { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; }
.row-left { display: flex; align-items: center; gap: 12px; }
.row-avatar { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; font-weight: 800; color: #fff; background: linear-gradient(135deg, var(--brand), #0a4b87); }
.row-client { font-weight: 800; }
.row-meta { color: var(--muted); font-size: 13px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.row-right { display: flex; align-items: center; gap: 10px; }
.row-amount { font-weight: 800; display: flex; align-items: center; gap: 6px; }
.row-pill { border: 1.5px solid; padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.row-actions { display: flex; align-items: center; gap: 6px; margin-left: 6px; opacity: 0.8; }

/* Colored icon buttons */
.icon { 
  width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
  border: 1px solid var(--line); background: transparent; cursor: pointer;
  transition: background .12s ease, transform .12s ease, border-color .12s ease, color .12s ease;
  color: var(--muted);
}
.icon:hover { transform: translateY(-1px); }

/* Light theme tints */
.icon-view  { color: var(--act-view-fg);  background: var(--act-view-bg);  border-color: var(--act-view-br); }
.icon-send  { color: var(--act-send-fg);  background: var(--act-send-bg);  border-color: var(--act-send-br); }
.icon-edit  { color: var(--act-edit-fg);  background: var(--act-edit-bg);  border-color: var(--act-edit-br); }
.icon-danger, .icon.danger { color: var(--act-del-fg); background: var(--act-del-bg); border-color: var(--act-del-br); }

/* Hover tints */
.icon-view:hover  { background: #dfe9ff; }
.icon-send:hover  { background: #ffe8d6; }
.icon-edit:hover  { background: #ebdcff; }
.icon-danger:hover{ background: #ffe3e6; }

/* + New Quote: brand bg, white content */
.md-topbar .btn.primary { background: linear-gradient(135deg, var(--brand), #0a4b87); color: #fff !important; border: none; }
.md-topbar .btn.primary svg { stroke: currentColor !important; }

/* FAB */
.fab { position: fixed; right: 28px; bottom: 28px; border-radius: 999px; width: 56px; height: 56px; display: grid; place-items: center; background: linear-gradient(135deg, var(--brand), #0a4b87); color: #fff; border: none; box-shadow: 0 16px 40px rgba(2,29,78,0.25); cursor: pointer; }

/* Responsive */
@media (max-width: 1080px) { .md-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 860px) {
  .md-root { grid-template-columns: 64px 1fr; }
  .row-main { grid-template-columns: 1fr; gap: 12px; }
  .row-right { justify-content: space-between; }
  .hide-sm { display: none; }
}
`;










