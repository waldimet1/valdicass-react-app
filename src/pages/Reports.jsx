// src/pages/Reports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { onSnapshot, collection, orderBy, query as fsQuery } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { DollarSign, CheckCircle2, BarChart3 } from "lucide-react";
import TopbarGuard from "../components/TopbarGuard";
import { useNavigate } from "react-router-dom";
import blueprintBg from "../assets/blueprint-bg.png";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";


export default function Reports() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
const navigate = useNavigate();

  // Live quotes (order by createdAt if present; still works if some docs miss it)
  useEffect(() => {
    const q = fsQuery(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setQuotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  // --- helpers ---
  const toDate = (v) => {
    try { return v?.toDate ? v.toDate() : new Date(v); } catch { return null; }
  };
  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const ymKey = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "");
  const monthLabel = (m) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m] || "";

  const now = new Date();
  const thisYear = now.getFullYear();

  // Normalize a quote row for calc
  const norm = (row) => {
    const dt = toDate(row.createdAt) || toDate(row.date) || null;
    const total = Number(row.total || 0);
    const status = String(row.status || "").toLowerCase();
    return { dt, total, won: status === "signed" || status === "approved" || status === "won" };
  };

  // Filter last 12 months and this-year datasets
  const { last12, ytd } = useMemo(() => {
    const twelveBack = new Date(now); twelveBack.setMonth(twelveBack.getMonth() - 11); twelveBack.setHours(0,0,0,0);
    const last12Arr = [];
    const ytdArr = [];
    for (const q of quotes) {
      const r = norm(q);
      if (!r.dt || isNaN(r.dt)) continue;
      if (r.dt >= twelveBack) last12Arr.push(r);
      if (r.dt.getFullYear() === thisYear) ytdArr.push(r);
    }
    return { last12: last12Arr, ytd: ytdArr };
  }, [quotes]);

  // Current month "revenue" proxy = sum of won totals in current month
  const monthKeyNow = ymKey(now);
  const revenueThisMonth = useMemo(() => {
    let sum = 0;
    for (const r of ytd) if (ymKey(r.dt) === monthKeyNow && r.won) sum += r.total;
    return sum;
  }, [ytd, monthKeyNow]);

  // Average closing ratio (last 12 months)
  const avgClose12 = useMemo(() => {
    const est = last12.length || 0;
    const won = last12.filter((r) => r.won).length || 0;
    return est ? Math.round((won / est) * 100) : 0;
  }, [last12]);

  // YTD aggregates by month (table)
  const ytdAgg = useMemo(() => {
    const map = new Map(); // key -> {estCnt, wonCnt, estSum, wonSum, month, year}
    for (const r of ytd) {
      const k = ymKey(r.dt);
      if (!map.has(k)) map.set(k, { estCnt: 0, wonCnt: 0, estSum: 0, wonSum: 0, month: r.dt.getMonth(), year: r.dt.getFullYear() });
      const a = map.get(k);
      a.estCnt += 1;
      a.estSum += r.total || 0;
      if (r.won) { a.wonCnt += 1; a.wonSum += r.total || 0; }
    }
    // return sorted: most recent month first
    return Array.from(map.values()).sort((a, b) => (b.year - a.year) || (b.month - a.month));
  }, [ytd]);

  // Win rate (this year) for donut
  const winRateThisYear = useMemo(() => {
    const est = ytd.length || 0;
    const won = ytd.filter((r) => r.won).length || 0;
    return est ? Math.round((won / est) * 100) : 0;
  }, [ytd]);

  // Donut geometry
  const donut = useMemo(() => {
    const r = 46;                       // radius
    const c = 2 * Math.PI * r;          // circumference
    const pct = Math.max(0, Math.min(100, winRateThisYear));
    const wonLen = (pct / 100) * c;
    const remLen = c - wonLen;
    return { r, c, wonLen, remLen, pct };
  }, [winRateThisYear]);

  return (
    <div className="rep-root">
      <style>{CSS}</style>

      <TopbarGuard>
        <header className="md-topbar">
  <div className="rep-top">
    <div className="rep-title">
      <h1>Reports</h1>
      <p>Overview of estimates performance</p>
    </div>

    <div className="rep-right">
      <div className="rep-tabs" role="tablist" aria-label="Report sections">
        <button className="tab ghost" disabled>Overview</button>
        <button className="tab ghost" disabled>Revenue</button>
        <button className="tab active" aria-selected>Estimates</button>
        <button className="tab ghost" disabled>Invoices</button>
      </div>

      <button
        className="rep-back"
        onClick={() => navigate("/dashboard")}
        title="Go back to Dashboard"
        aria-label="Back to Dashboard"
      >
        ← Back to Dashboard
      </button>
    </div>
  </div>
</header>
      </TopbarGuard>

      <main>
        <section className="rep-grid">
          {/* Left cards */}
          <div className="rep-col-left">
            <Card title="REVENUE (proxy)" icon={<DollarSign />}>
              <div className="kpi-money">{money(revenueThisMonth)}</div>
              <div className="kpi-sub">won in {now.toLocaleString(undefined,{month:"long"})}</div>
            </Card>

            <Card title="ESTIMATES" icon={<CheckCircle2 />}>
              <div className="kpi-perc">{avgClose12}%</div>
              <div className="kpi-sub">avg closing ratio (last 12 months)</div>
            </Card>

            <Card title="INVOICES" icon={<BarChart3 />}>
              <div className="kpi-money">{money(0)}</div>
              <div className="kpi-sub">total invoiced (demo)</div>
            </Card>
          </div>

          {/* Right big panel */}
          <div className="rep-col-right">
            <div className="panel">
              <div className="panel-head">
                <div className="ph-left">
                  <div className="ph-title">Win Rate This Year</div>
                  <div className="ph-perc">{donut.pct}%</div>
                </div>
                <div className="ph-chart" aria-label="Win vs Issued/Pending donut">
                  <svg width="120" height="120" viewBox="0 0 120 120" role="img">
                    <circle cx="60" cy="60" r={donut.r} fill="none" stroke="#e5e7eb" strokeWidth="16" />
                    <circle
                      cx="60"
                      cy="60"
                      r={donut.r}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="16"
                      strokeDasharray={`${donut.wonLen} ${donut.remLen}`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="legend">
                    <span className="dot won" /> Won
                    <span className="dot rest" /> Issued / Pending
                  </div>
                </div>
              </div>

              <div className="table-wrap" role="region" aria-label="Estimates by month">
                <table className="rep-table">
                  <thead>
                    <tr>
                      <th style={{width: 120}}>Issued Date</th>
                      <th>Estimated</th>
                      <th>Approved</th>
                      <th>Win %</th>
                      <th>$ Estimated</th>
                      <th>$ Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Year header row */}
                    <tr className="year-row">
                      <td colSpan={6}>{thisYear}</td>
                    </tr>

                    {ytdAgg.length === 0 ? (
                      <tr><td colSpan={6} style={{textAlign:"center", color:"var(--muted)"}}>
                        {loading ? "Loading…" : "No data for this year."}
                      </td></tr>
                    ) : (
                      ytdAgg.map((m) => {
                        const win = m.estCnt ? Math.round((m.wonCnt / m.estCnt) * 100) : 0;
                        return (
                          <tr key={`${m.year}-${m.month}`}>
                            <td>{monthLabel(m.month)}</td>
                            <td>{m.estCnt}</td>
                            <td>{m.wonCnt}</td>
                            <td>{win}</td>
                            <td>{money(m.estSum)}</td>
                            <td>{money(m.wonSum)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
        <div className="card-icn">{icon}</div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

const CSS = `
:root{
  --line:#e5e7eb; --text:#0f172a; --muted:#64748b; --brand:#0b63b2; --soft:#f8fafc;
}

*{box-sizing:border-box}
body{color:var(--text); font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}

.rep-root{padding: 8px 16px 32px}

/* Sticky header (TopbarGuard sets --topbar-h; the rule below offsets content on any page using .md-topbar) */
.md-topbar{
  position: sticky; top: 0; z-index: 30;
  background:#fff; border-bottom:1px solid var(--line);
}
.md-topbar + * { margin-top: calc(var(--topbar-h, 80px) + 8px); }

.rep-top{display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 4px;}
.rep-title h1{margin:0; font-size:20px}
.rep-title p{margin:2px 0 0; color:var(--muted); font-size:13px}
.rep-tabs{display:flex; gap:8px; flex-wrap:wrap}
.tab{border:1px solid var(--line); background:#fff; border-radius:10px; padding:8px 12px; font-weight:700; color:var(--text)}
.tab.ghost{opacity:.6}
.tab.active{background:linear-gradient(135deg, var(--brand), #0a4b87); color:#fff; border:none}
.rep-right{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

/* Back to dashboard button */
.rep-back{
  border:1px solid var(--line);
  background:#2C84E0;
  border-radius:10px;
  padding:8px 12px;
  font-weight:700;
  cursor:pointer;
}
.rep-back:hover{ background:#f3f4f6; }
/* Layout */
.rep-grid{display:grid; grid-template-columns: 320px 1fr; gap:14px; align-items:start; margin-top:12px}
@media (max-width: 980px){ .rep-grid{grid-template-columns:1fr} }

/* Left column cards */
.card{border:1px solid var(--line); border-radius:14px; background:#fff}
.card-head{display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid var(--line); background:#fafafa}
.card-title{font-size:12px; font-weight:800; color:#475569; letter-spacing:.06em}
.card-icn{opacity:.8}
.card-body{padding:14px 12px}
.kpi-money{font-size:24px; font-weight:900}
.kpi-perc{font-size:26px; font-weight:900; color:#16a34a}
.kpi-sub{font-size:12px; color:var(--muted); margin-top:4px}

/* Right side panel */
.panel{border:1px solid var(--line); border-radius:14px; background:#fff; overflow:hidden}
.panel-head{display:flex; gap:12px; padding:14px 12px; border-bottom:1px solid var(--line); align-items:center; justify-content:space-between; background:#fafafa}
.ph-left .ph-title{font-size:13px; color:#475569; font-weight:800; letter-spacing:.04em}
.ph-left .ph-perc{font-size:28px; font-weight:900}
.ph-chart{display:flex; align-items:center; gap:12px}
.legend{display:flex; align-items:center; gap:10px; color:#374151; font-size:12px}
.dot{width:10px; height:10px; border-radius:50%; display:inline-block}
.dot.won{background:#22c55e}
.dot.rest{background:#e5e7eb; border:1px solid #d1d5db}

/* Table */
.table-wrap{overflow:auto}
.rep-table{width:100%; border-collapse:collapse}
.rep-table thead th{
  position:sticky; top:0; background:#fff;
  text-align:left; font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.04em;
  border-bottom:1px solid var(--line); padding:10px 8px;
}
.rep-table tbody td{border-bottom:1px solid #f1f5f9; padding:10px 8px; font-size:14px}
.rep-table tbody tr:hover td{background:#fafafa}
.year-row td{
  background:#f3f4f6; font-weight:800; color:#111827; border-bottom:2px solid var(--line);
}
`;

