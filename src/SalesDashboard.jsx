import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { auth, db } from "./firebaseConfig";

const SalesDashboard = () => {
  const [quotes, setQuotes] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const q = query(
          collection(db, "quotes"),
          where("createdBy", "==", currentUser.uid)
        );

        const unsubscribeQuotes = onSnapshot(q, (snapshot) => {
          const quoteData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setQuotes(quoteData);
        });

        return () => unsubscribeQuotes();
      } else {
        setUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleView = (quoteId) => {
    navigate(`/view?id=${quoteId}`);
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
const handleEdit = (quoteId) => {
  navigate(`/edit?id=${quoteId}`);
};

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ color: "#004a99", marginBottom: "1rem" }}>📊 My Sent Quotes</h1>

      {quotes.length === 0 ? (
        <p>No quotes found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#eaf2fb", textAlign: "left" }}>
              <th style={{ padding: "0.75rem" }}>Client</th>
              <th>Total</th>
              <th>Status</th>
              <th>Location</th>
              <th>Material</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "0.75rem" }}>{q.client?.name || "N/A"}</td>
                <td>${q.total || "N/A"}</td>
                <td>
                  {q.declined
                    ? "❌ Declined"
                    : q.signed
                    ? "✅ Signed"
                    : q.viewed
                    ? "👁 Viewed"
                    : "📤 Sent"}
                </td>
                <td>{q.location || "–"}</td>
                <td>{`${q.material || ""} ${q.series || ""} ${q.style || ""}`}</td>
                <td>
  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
    <button onClick={() => handleView(q.id)} style={btnStyle}>View</button>
    <button onClick={() => handleResend(q)} style={{ ...btnStyle, backgroundColor: "#888" }}>
      Resend
    </button>
    <button onClick={() => navigate(`/edit?id=${q.id}`)} style={{ ...btnStyle, backgroundColor: "#f4a300" }}>
  ✏️ Edit
</button>


    <button onClick={() => handleDownload(q.id)} style={{ ...btnStyle, backgroundColor: "#555" }}>
      Download PDF
    </button>
  </div>
</td>

              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ToastContainer />
    </div>
  );
};

const btnStyle = {
  backgroundColor: "#004a99",
  color: "white",
  padding: "0.4rem 0.8rem",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.85rem",
};

export default SalesDashboard;

