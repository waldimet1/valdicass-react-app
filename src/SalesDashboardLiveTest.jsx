import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth, db } from "./firebaseConfig";
import "./SalesDashboard.css";
import Header from "./components/Header";
import { deleteDoc, doc } from "firebase/firestore";

const formatMonthYear = (timestamp) => {
  if (!timestamp) return "Unknown";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
};

const SalesDashboardLiveTest = () => {
  const [quotes, setQuotes] = useState([]);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("All");

  const headerRef = useRef(null);
  const mainRef = useRef(null);

  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (headerRef.current && mainRef.current) {
      const headerHeight = headerRef.current.offsetHeight;
      mainRef.current.style.paddingTop = `${headerHeight}px`;
    }
  }, []);

  useEffect(() => {
    let unsubscribeQuotes;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const q = query(collection(db, "quotes"), where("userId", "==", currentUser.uid));
        unsubscribeQuotes = onSnapshot(q, (snapshot) => {
          const quoteData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setQuotes(quoteData);
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      if (unsubscribeQuotes) unsubscribeQuotes();
      unsubscribeAuth();
    };
  }, []);

  const handleView = (quoteId) => navigate(`/view?id=${quoteId}`);
  const handleEdit = (quoteId) => navigate(`/edit?id=${quoteId}`);
const handleDelete = async (quoteId) => {
  const confirmed = window.confirm("⚠️ Are you sure you want to delete this quote? This cannot be undone.");
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "quotes", quoteId));
    toast.success("🗑️ Quote deleted successfully!");
  } catch (err) {
    console.error("❌ Error deleting quote:", err);
    toast.error("Failed to delete quote.");
  }
};

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

  const handleResend = async (quote) => {
    if (!quote.client?.email) {
      toast.error("❌ This quote has no client email on file.");
      return;
    }
    try {
      const res = await fetch("https://valdicass-server.vercel.app/sendQuoteEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: quote.id,
          clientEmail: quote.client.email,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("✅ Quote re-sent!", { autoClose: 3000 });
      } else {
        toast.error("❌ Failed to resend quote: " + result.error);
      }
    } catch (err) {
      console.error("❌ Error resending quote:", err);
      toast.error("❌ Failed to resend quote.");
    }
  };
const [activeFilter, setActiveFilter] = useState("All");
const filters = ["All", "Sent", "Viewed", "Signed", "Declined"];

<div className="filter-buttons">
  {filters.map((filter) => (
    <button
      key={filter}
      onClick={() => setActiveFilter(filter)}
      className={`filter-button ${activeFilter === filter ? "active" : ""}`}
    >
      {filter}
    </button>
  ))}
</div>

  const filteredQuotes = quotes.filter((q) => {
    if (activeTab === "All") return true;
    if (activeTab === "Sent") return !q.viewed && !q.signed && !q.declined;
    if (activeTab === "Viewed") return q.viewed && !q.signed && !q.declined;
    if (activeTab === "Signed") return q.signed;
    if (activeTab === "Declined") return q.declined;
    
    return true;
  });

  return (
    <>
      <div ref={headerRef}>
        <Header />
      </div>

      <main ref={mainRef} className="dashboard-container">
        

        <div className="tab-row">
          {["All", "Sent", "Viewed", "Signed", "Declined"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-button ${activeTab === tab ? "active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="quote-grid">
          {filteredQuotes.map((q) => (
            <div key={q.id} className="quote-card-modern">
              <div className="quote-card-header">
                <div>
                  <h2 className="client-name">{q.client?.name || "Unnamed Client"}</h2>
                  <p className="quote-meta">{q.location || "No location"}</p>
                </div>
                <div className={`status-tag ${q.signed ? 'signed' : q.declined ? 'declined' : q.viewed ? 'viewed' : 'sent'}`}>
                  {q.declined
                    ? "Declined"
                    : q.signed
                    ? "Signed"
                    : q.viewed
                    ? "Viewed"
                    : "Sent"}
                </div>
              </div>

              <div className="quote-card-body">
                <div className="total-display">
                  <strong>Total:</strong> ${q.total?.toLocaleString() || "N/A"}
                </div>
                <div className="button-group">
                  <button onClick={() => handleView(q.id)} className="btn btn-view">View</button>
                  <button onClick={() => handleResend(q)} className="btn btn-resend">Resend</button>
                  <button onClick={() => handleEdit(q.id)} className="btn btn-edit">✏️ Edit</button>
                  <button onClick={() => handleDelete(q.id)} className="btn btn-delete">Delete</button>

                  <button onClick={() => handleDownload(q.id)} className="btn btn-download">Download</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <ToastContainer />
      </main>
    </>
  );
};

export default SalesDashboardLiveTest;


