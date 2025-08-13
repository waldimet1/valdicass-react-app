// src/SalesDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth, db } from "./firebaseConfig";
import "./SalesDashboard.css";

const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2"; // same as App.jsx

const SalesDashboardLiveTest = () => {
  const [quotes, setQuotes] = useState([]);
  const [filteredQuotes, setFilteredQuotes] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [user, setUser] = useState(null);
  const [sendingId, setSendingId] = useState(null); // ✅ disable resend per-quote while sending
  const navigate = useNavigate();

  // track previous states per doc to detect transitions
  const prevMapRef = useRef(new Map()); // id -> { viewed, signed, declined, status }

  useEffect(() => {
    let unsubscribeQuotes;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const q = query(collection(db, "quotes"), where("userId", "==", currentUser.uid));

        unsubscribeQuotes = onSnapshot(q, (snapshot) => {
          // --- Real-time toast for admin on changes ---
          if (currentUser.uid === ADMIN_UID) {
            snapshot.docChanges().forEach((change) => {
              const id = change.doc.id;
              const data = { id, ...change.doc.data() };

              // Build normalized current flags
              const curr = {
                viewed: data.viewed === true || (data.status || "").toLowerCase() === "viewed",
                signed: data.signed === true || (data.status || "").toLowerCase() === "signed",
                declined: data.declined === true || (data.status || "").toLowerCase() === "declined",
                status: (data.status || "").toLowerCase(),
              };

              const prev = prevMapRef.current.get(id);

              if (change.type === "added") {
                // initialize prev cache without toasting on initial load
                prevMapRef.current.set(id, curr);
                return;
              }

              if (change.type === "modified" && prev) {
                // Detect transitions
                const client = data.client?.name || "Client";
                if (!prev.viewed && curr.viewed) {
                  toast.info(`👀 ${client} viewed quote • $${Number(data.total || 0).toLocaleString()}`);
                }
                if (!prev.signed && curr.signed) {
                  toast.success(`✅ ${client} signed quote • $${Number(data.total || 0).toLocaleString()}`);
                }
                if (!prev.declined && curr.declined) {
                  toast.error(`❌ ${client} declined quote • $${Number(data.total || 0).toLocaleString()}`);
                }
                // update cache after checks
                prevMapRef.current.set(id, curr);
              } else {
                // for safety, keep cache in sync
                prevMapRef.current.set(id, curr);
              }
            });
          }

          // --- Update list in UI ---
          const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setQuotes(list);

          // also refresh prevMap on full snapshot (ensures cache never drifts)
          list.forEach((q) => {
            const curr = {
              viewed: q.viewed === true || (q.status || "").toLowerCase() === "viewed",
              signed: q.signed === true || (q.status || "").toLowerCase() === "signed",
              declined: q.declined === true || (q.status || "").toLowerCase() === "declined",
              status: (q.status || "").toLowerCase(),
            };
            if (!prevMapRef.current.has(q.id)) {
              prevMapRef.current.set(q.id, curr);
            }
          });
        });
      } else {
        setUser(null);
        setQuotes([]);
        prevMapRef.current.clear();
      }
    });

    return () => {
      if (unsubscribeQuotes) unsubscribeQuotes();
      unsubscribeAuth();
    };
  }, []);

  // Normalize helper shared with filters
  const normalize = (q) => {
    const status = (q.status || "").toLowerCase();
    const viewed = q.viewed === true || status === "viewed";
    const signed = q.signed === true || status === "signed";
    const declined = q.declined === true || status === "declined";
    const sent =
      (!viewed && !signed && !declined) || status === "sent" || status === "";
    return { viewed, signed, declined, sent };
  };

  useEffect(() => {
    const out = quotes.filter((q) => {
      const s = normalize(q);
      if (activeTab === "All") return true;
      if (activeTab === "Sent") return s.sent;
      if (activeTab === "Viewed") return s.viewed && !s.signed && !s.declined;
      if (activeTab === "Signed") return s.signed;
      if (activeTab === "Declined") return s.declined;
      return true;
    });
    setFilteredQuotes(out);
  }, [quotes, activeTab]);

  const handleView = (quoteId) => navigate(`/view-quote?id=${quoteId}`); // match your route
  const handleEdit = (quoteId) => navigate(`/edit?id=${quoteId}`);

  const handleDownload = async (quoteId) => {
    try {
      const url = `https://valdicass-server.vercel.app/downloadQuotePdf?quoteId=${quoteId}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = `quote-${quoteId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("❌ Error downloading PDF:", err);
      toast.error("❌ Failed to download quote PDF.");
    }
  };

  // ✅ Robust resend that builds the exact client link and disables while sending
  const handleResend = async (quote) => {
    const email = quote.client?.clientEmail || quote.client?.email; // support both shapes
    if (!email) {
      toast.error("❌ This quote has no client email on file.");
      return;
    }
    try {
      setSendingId(quote.id);

      // build the client-facing link
      const base = window.location.origin.includes("localhost")
        ? "http://localhost:3000"
        : "https://app.valdicass.com";
      const shareUrl = `${base}/view-quote?id=${quote.id}`;

      const res = await fetch("https://valdicass-server.vercel.app/sendQuoteEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          clientEmail: email,
          clientName: quote.client?.name || "",
          total: Number(quote.total || 0),
          shareUrl, // include the exact link the client should open
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("✅ Quote re-sent to client");
      } else {
        toast.error("❌ Failed to resend" + (result?.error ? `: ${result.error}` : ""));
      }
    } catch (err) {
      console.error("❌ Error resending quote:", err);
      toast.error("❌ Failed to resend quote.");
    } finally {
      setSendingId(null);
    }
  };

  // Optional: show counts on tabs
  const tabCounts = useMemo(() => {
    const counts = { All: quotes.length, Sent: 0, Viewed: 0, Signed: 0, Declined: 0 };
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
    <div className="dashboard-container">
      <h1 className="dashboard-title">My Quotes</h1>

      {/* Filter Tabs */}
      <div className="dashboard-tabs">
        {["All", "Sent", "Viewed", "Signed", "Declined"].map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} {tabCounts[tab] !== undefined ? `(${tabCounts[tab]})` : ""}
          </button>
        ))}
      </div>

      {filteredQuotes.length === 0 ? (
        <p>No quotes found for "{activeTab}".</p>
      ) : (
        <div className="quote-grid">
          {filteredQuotes.map((q) => (
            <div key={q.id} className="quote-card-modern">
              <div className="quote-card-header">
                <div>
                  <h2 className="client-name">{q.client?.name || "Unnamed Client"}</h2>
                  <p className="quote-meta">
                    {q.location || "No location"}<br />
                    {`${q.material || ""} ${q.series || ""} ${q.style || ""}`}
                  </p>
                </div>
                <div className={`status-tag ${normalize(q).signed ? "signed" : normalize(q).declined ? "declined" : normalize(q).viewed ? "viewed" : "sent"}`}>
                  {normalize(q).declined
                    ? "Declined"
                    : normalize(q).signed
                    ? "Signed"
                    : normalize(q).viewed
                    ? "Viewed"
                    : "Sent"}
                </div>
              </div>

              <div className="quote-card-body">
                <div className="total-display">
                  <strong>Total:</strong> ${Number(q.total || 0).toLocaleString()}
                </div>
                <div className="button-group">
                  <button onClick={() => handleView(q.id)} className="btn btn-view">View</button>
                  <button
                    onClick={() => handleResend(q)}
                    className="btn btn-resend"
                    disabled={sendingId === q.id}
                  >
                    {sendingId === q.id ? "Sending…" : "Resend"}
                  </button>
                  <button onClick={() => handleEdit(q.id)} className="btn btn-edit">✏️ Edit</button>
                  <button onClick={() => handleDownload(q.id)} className="btn btn-download">Download</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3500} />
    </div>
  );
};

export default SalesDashboardLiveTest;





