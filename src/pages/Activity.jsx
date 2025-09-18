import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query as fsQuery } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  Eye, Mail, CheckCircle2, Send, XCircle, FileText, Clock, ArrowLeft
} from "lucide-react";
import NotificationsBell from "../components/NotificationsBell";

/**
 * Activity feed
 * Firestore collection expected: "activity"
 * doc fields (suggested):
 * - type: "viewed" | "email_opened" | "signed" | "sent" | "declined" | "created" ...
 * - quoteId: string
 * - quoteNumber?: string (e.g., "#689809")
 * - clientName?: string
 * - message?: string (optional custom text)
 * - createdAt: Timestamp | Date
 */

export default function Activity() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- data ----
  useEffect(() => {
    const q = fsQuery(collection(db, "activity"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(data.length ? data : SAMPLE_ROWS); // fallback demo if no docs
        setLoading(false);
      },
      () => {
        setRows(SAMPLE_ROWS);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // ---- helpers ----
  const toDate = (v) => {
    try { return v?.toDate ? v.toDate() : new Date(v); } catch { return null; }
  };

  const isToday = (d) => {
    if (!d) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  };

  const timeString = (d) =>
    d ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";

  const msgFor = (r) => {
    if (r.message) return r.message;
    const qno = r.quoteNumber ? ` ${r.quoteNumber}` : r.quoteId ? ` ${shortId(r.quoteId)}` : "";
    const forWho = r.clientName ? ` for ${r.clientName}` : "";
    const prefix = `Estimate${qno}${forWho}`;
    switch ((r.type || "").toLowerCase()) {
      case "viewed":       return `${prefix} was viewed.`;
      case "email_opened": return `Email for${qno || " estimate"} was opened${forWho ? ` by ${r.clientName}` : ""}.`;
      case "signed":       return `${prefix} was signed.`;
      case "sent":         return `${prefix} was sent.`;
      case "declined":     return `${prefix} was declined.`;
      case "created":      return `${prefix} was created.`;
      default:             return `${prefix} was updated.`;
    }
  };

  const iconFor = (type) => {
    switch ((type || "").toLowerCase()) {
      case "viewed":       return <Eye size={18} />;
      case "email_opened": return <Mail size={18} />;
      case "signed":       return <CheckCircle2 size={18} />;
      case "sent":         return <Send size={18} />;
      case "declined":     return <XCircle size={18} />;
      case "created":      return <FileText size={18} />;
      default:             return <Clock size={18} />;
    }
  };

  const colorFor = (type) => {
    switch ((type || "").toLowerCase()) {
      case "viewed":       return "var(--act-view-fg, #1b4ed1)";
      case "email_opened": return "var(--accent, #ff7a00)";
      case "signed":       return "var(--pill-signed, #067647)";
      case "sent":         return "var(--pill-sent, #4169e1)";
      case "declined":     return "var(--pill-declined, #b4232a)";
      default:             return "var(--muted, #6b7280)";
    }
  };

  const shortId = (id = "") => (id ? `#${id.slice(-6).toUpperCase()}` : "");

  // group into Today / Previous
  const { today, previous } = useMemo(() => {
    const t = [], p = [];
    for (const r of rows) {
      const dt = toDate(r.createdAt);
      const row = { ...r, dt };
      (isToday(dt) ? t : p).push(row);
    }
    return { today: t, previous: p };
  }, [rows]);

  const sameOrigin = (u) => {
    try { return new URL(u, window.location.href).origin === window.location.origin; }
    catch { return false; }
  };
  const goBack = () => {
    const cameFromApp = sameOrigin(document.referrer || "");
    if (cameFromApp && window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  return (
    <div className="act-root">
      <style>{CSS}</style>

     <header className="md-topbar">
  <div className="act-head">
    <button className="btn back" onClick={goBack}><ArrowLeft size={16}/> Go Back</button>
    <div className="act-title"><h1>Activity</h1></div>
    <div style={{ marginLeft: "auto" }}>
      <NotificationsBell
        items={rows}
        storageKey="activityLastSeen"
        onOpen={() => {/* optional: open a drawer/popover if you add one later */}}
      />
    </div>
  </div>
</header>


      <section className="act-wrap">
        {loading && <div className="loading">Loading…</div>}

        {!loading && (
          <>
            <Section title="Today">
              {today.length === 0 ? (
                <EmptyNote text="No activity yet today." />
              ) : (
                today.map((r) => (
                  <Row
                    key={r.id}
                    icon={iconFor(r.type)}
                    color={colorFor(r.type)}
                    message={msgFor(r)}
                    time={timeString(r.dt)}
                    onOpen={() => r.quoteId && navigate(`/view-quote?id=${r.quoteId}`)}
                  />
                ))
              )}
            </Section>

            <Section title="Previous">
              {previous.length === 0 ? (
                <EmptyNote text="No earlier activity." />
              ) : (
                previous.map((r) => (
                  <Row
                    key={r.id}
                    icon={iconFor(r.type)}
                    color={colorFor(r.type)}
                    message={msgFor(r)}
                    time={r.dt?.toLocaleDateString() + " " + timeString(r.dt)}
                    onOpen={() => r.quoteId && navigate(`/view-quote?id=${r.quoteId}`)}
                  />
                ))
              )}
            </Section>
          </>
        )}
      </section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="act-section">
      <div className="act-sep" role="separator" />
      <div className="act-h">{title}</div>
      <div className="act-list">{children}</div>
    </div>
  );
}

function Row({ icon, color, message, time, onOpen }) {
  return (
    <article className="act-row">
      <div className="act-icn" style={{ color }}>{icon}</div>
      <div className="act-main">
        <div className="act-msg">{message}</div>
        <div className="act-time">{time}</div>
      </div>
      {onOpen && (
        <button className="act-open" onClick={onOpen} title="Open">
          Open
        </button>
      )}
    </article>
  );
}

function EmptyNote({ text }) {
  return <div className="act-empty">{text}</div>;
}

// Fallback sample items (shown if your "activity" collection is empty)
const SAMPLE_ROWS = [
  { id: "a1", type: "viewed",  quoteId: "689809", clientName: "Kathy & Mike Bax", createdAt: new Date() },
  { id: "a2", type: "email_opened", quoteId: "689800", clientName: "Jean McCarthy", createdAt: new Date(Date.now() - 60*60*1000) },
  { id: "a3", type: "signed",  quoteId: "689799", clientName: "Sibyl Krucoff", createdAt: new Date(Date.now() - 24*60*60*1000) },
  { id: "a4", type: "declined", quoteId: "689781", clientName: "Laura McKinney", createdAt: new Date(Date.now() - 2*24*60*60*1000) },
  { id: "a5", type: "sent",    quoteId: "689770", clientName: "Cathy & Jim Esposito", createdAt: new Date(Date.now() - 3*24*60*60*1000) },
];

const CSS = `
:root{
  --line:#e5e7eb; --text:#0f172a; --muted:#6b7280; --panel:rgba(255,255,255,0.7);
}
*{box-sizing:border-box}
.act-root{padding:8px 16px 32px}

/* top bar */
.md-topbar{position:sticky; top:0; z-index:30; background:#fff; border-bottom:1px solid var(--line);}
.act-head{display:flex; align-items:center; gap:12px; padding:10px 0;}
.btn.back{
  display:inline-flex; align-items:center; gap:6px;
  background:#fff; border:1px solid var(--line); border-radius:999px; padding:8px 12px; font-weight:700;
}
.act-title h1{margin:0; font-size:20px}

/* list layout */
.act-wrap{max-width:900px; margin:0 auto}
.act-section{margin-top:10px}
.act-sep{height:1px; background:var(--line); margin:10px 0}
.act-h{font-weight:800; color:#374151; margin: 4px 0 10px;}
.act-list{display:grid; gap:8px}
.act-row{
  display:grid; grid-template-columns:auto 1fr auto; gap:10px;
  border:1px solid var(--line); background:var(--panel); backdrop-filter: blur(8px);
  border-radius:12px; padding:10px 12px;
}
.act-icn{width:34px; height:34px; border-radius:10px; display:grid; place-items:center; background:#f1f5f9;}
.act-main{display:flex; flex-direction:column; gap:4px}
.act-msg{font-weight:600}
.act-time{color:var(--muted); font-size:12px}
.act-open{
  border:1px solid var(--line); border-radius:10px; padding:6px 10px; background:#fff; cursor:pointer; font-weight:700;
}
.act-open:hover{background:#f3f4f6}
.act-empty{color:var(--muted); padding:10px; border:1px dashed var(--line); border-radius:10px; background:#fff}
.loading{padding:8px 10px; border:1px solid var(--line); border-radius:10px; background:#fff; width:max-content}
`;
