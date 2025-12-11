// src/pages/QuoteDashboardModern.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth, db } from "../firebaseConfig";

const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2";
const API_BASE = "https://valdicass-sendquote-api.vercel.app";

const QuoteDashboardModern = () => {
  const [user, setUser] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const prevMapRef = useRef(new Map()); // id -> { viewed, signed, declined, status }

  // Normalize quote status
  const normalize = (q) => {
    const status = (q.status || "").toLowerCase();
    const viewed = q.viewed === true || status === "viewed";
    const signed = q.signed === true || status === "signed";
    const declined = q.declined === true || status === "declined";
    const sent =
      (!viewed && !signed && !declined) || status === "sent" || status === "";
    return { viewed, signed, declined, sent, status };
  };

  // Auth + Firestore subscription
  useEffect(() => {
    let unsubscribeQuotes;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log("[DEBUG] auth state change →", currentUser?.uid || null);
      setUser(currentUser || null);

      if (!currentUser) {
        setQuotes([]);
        prevMapRef.current.clear();
        if (unsubscribeQuotes) unsubscribeQuotes();
        return;
      }

      const q = query(
        collection(db, "quotes"),
        where("userId", "==", currentUser.uid)
      );

      unsubscribeQuotes = onSnapshot(
        q,
        (snapshot) => {
          console.log("[DEBUG] snapshot docs:", snapshot.docs.length);

          // Admin toasts
          if (currentUser.uid === ADMIN_UID) {
            snapshot.docChanges().forEach((change) => {
              const id = change.doc.id;
              const data = { id, ...change.doc.data() };
              const curr = normalize(data);
              const prev = prevMapRef.current.get(id);

              if (change.type === "added") {
                prevMapRef.current.set(id, curr);
                return;
              }

              if (change.type === "modified" && prev) {
                const client = data.client?.name || "Client";
                const amount = Number(data.total || 0).toLocaleString();

                if (!prev.viewed && curr.viewed) {
                  toast.info(`👀 ${client} viewed quote • $${amount}`);
                }
                if (!prev.signed && curr.signed) {
                  toast.success(`✅ ${client} signed quote • $${amount}`);
                }
                if (!prev.declined && curr.declined) {
                  toast.error(`❌ ${client} declined quote • $${amount}`);
                }
                prevMapRef.current.set(id, curr);
              } else {
                prevMapRef.current.set(id, curr);
              }
            });
          }

          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log("[DEBUG] mapped quotes length:", list.length);
          setQuotes(list);

          list.forEach((qDoc) => {
            if (!prevMapRef.current.has(qDoc.id)) {
              prevMapRef.current.set(qDoc.id, normalize(qDoc));
            }
          });
        },
        (err) => {
          console.error("Firestore snapshot error:", err);
        }
      );
    });

    return () => {
      if (unsubscribeQuotes) unsubscribeQuotes();
      unsubscribeAuth();
    };
  }, []);

  // Filter by tab + search
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    const out = quotes.filter((q) => {
      const s = normalize(q);

      if (activeTab === "Sent" && !s.sent) return false;
      if (activeTab === "Viewed" && !(s.viewed && !s.signed && !s.declined))
        return false;
      if (activeTab === "Signed" && !s.signed) return false;
      if (activeTab === "Declined" && !s.declined) return false;

      if (!term) return true;

      const haystack =
        [
          q.client?.name,
          q.location,
          q.client?.clientEmail,
          q.client?.email,
          q.id,
        ]
          .join(" ")
          .toLowerCase() || "";

      return haystack.includes(term);
    });

    console.log("[DEBUG] filteredQuotes length:", out.length);
    setFilteredQuotes(out);
  }, [quotes, activeTab, searchTerm]);

  const handleView = (quoteId) => navigate(`/view-quote?id=${quoteId}`);
  const handleEdit = (quoteId) => navigate(`/edit?id=${quoteId}`);
  const handleDownload = (quoteId) =>
    navigate(`/view-quote?id=${quoteId}&download=1`);

  const handleResend = async (quote) => {
    const email = quote.client?.clientEmail || quote.client?.email;
    if (!email) {
      toast.error("❌ This quote has no client email on file.");
      return;
    }

    const shareUrl = `https://app.valdicass.com/view-quote?id=${quote.id}`;

    try {
      const res = await fetch(`${API_BASE}/api/sendQuoteEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          clientEmail: email,
          clientName: quote.client?.name || "Client",
          total: Number(quote.total || 0),
          shareUrl,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || `HTTP ${res.status}`);

      toast.success("✅ Quote sent to client.");
    } catch (err) {
      console.error("❌ Error resending quote:", err);
      toast.error("❌ Could not send email. Check API logs.");
    }
  };

  const tabCounts = useMemo(() => {
    const counts = {
      All: quotes.length,
      Sent: 0,
      Viewed: 0,
      Signed: 0,
      Declined: 0,
    };
    quotes.forEach((q) => {
      const s = normalize(q);
      if (s.sent) counts.Sent++;
      if (s.viewed && !s.signed && !s.declined) counts.Viewed++;
      if (s.signed) counts.Signed++;
      if (s.declined) counts.Declined++;
    });
    return counts;
  }, [quotes]);

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-shell">
        {/* Small debug line so we can see auth + count */}
        <div
          style={{
            fontSize: "11px",
            color: "#6b7280",
            marginBottom: "4px",
          }}
        >
          Debug: user = {user ? user.uid : "none"}, quotes = {quotes.length}
        </div>

        {/* Header */}
        <header className="dashboard-header">
          <h1 className="dashboard-title">Quotes</h1>
        </header>

        {/* Toolbar */}
        <div className="dashboard-toolbar">
          <input
            className="dashboard-search"
            type="text"
            placeholder="Search by client, address, or quote ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="dashboard-tabs-row">
            {["All", "Sent", "Viewed", "Signed", "Declined"].map((tab) => (
              <button
                key={tab}
                className={`tab-chip ${
                  activeTab === tab ? "tab-chip-active" : ""
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}{" "}
                {tabCounts[tab] !== undefined ? `(${tabCounts[tab]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Quote rows */}
        <div className="quote-list">
          {filteredQuotes.length === 0 ? (
            <p className="empty-state">
              No quotes found for “{activeTab}”.
            </p>
          ) : (
            filteredQuotes.map((q) => {
              const s = normalize(q);
              const statusClass = s.declined
                ? "status-declined"
                : s.signed
                ? "status-signed"
                : s.viewed
                ? "status-viewed"
                : "status-sent";

              const statusLabel = s.declined
                ? "Declined"
                : s.signed
                ? "Signed"
                : s.viewed
                ? "Viewed"
                : "Sent";

              const clientName = q.client?.name || "Unnamed Client";
              const location = q.location || "";
              const total = Number(q.total || 0).toLocaleString();

              return (
                <div key={q.id} className="quote-card">
                  <div className="quote-left">
                    <div className="quote-title-row">
                      <span className="quote-client-name">{clientName}</span>
                      <span className={`status-badge ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="quote-meta-row">
                      {location && (
                        <span className="quote-meta">{location}</span>
                      )}
                      {q.client?.clientEmail && (
                        <span className="quote-meta">
                          {" "}
                          • {q.client.clientEmail}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="quote-right">
                    <div className="quote-total">${total}</div>
                    <div className="button-group">
                      <button
                        onClick={() => handleView(q.id)}
                        className="btn btn-view"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleEdit(q.id)}
                        className="btn btn-edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleResend(q)}
                        className="btn btn-resend"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => handleDownload(q.id)}
                        className="btn btn-download"
                      >
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <ToastContainer position="top-right" autoClose={3500} />
      </div>
    </div>
  );
};

export default QuoteDashboardModern;


