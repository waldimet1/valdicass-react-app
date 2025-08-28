import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import axios from "axios";

const MyQuotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingStates, setSendingStates] = useState({}); // Track per-quote email sending status

  useEffect(() => {
    const fetchQuotes = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, "quotes"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        const quoteList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setQuotes(quoteList);
      } catch (error) {
        console.error("🔥 Error fetching quotes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, []);

  const handleSendToClient = async (quoteId, clientEmail) => {
    setSendingStates((prev) => ({ ...prev, [quoteId]: "sending" }));
    try {
      console.log(`🚩 Sending quote ${quoteId} to ${clientEmail}`);
      const response = await axios.post(
        "https://valdicass-backend.onrender.com/sendQuoteEmail",
        {
          quoteId,
          clientEmail,
        }
      );
      console.log("✅ Email sent:", response.data);
      setSendingStates((prev) => ({ ...prev, [quoteId]: "sent" }));
      setTimeout(() => {
        setSendingStates((prev) => ({ ...prev, [quoteId]: null }));
      }, 3000); // Reset after 3 seconds
    } catch (error) {
      console.error("🔥 Error sending email:", error);
      setSendingStates((prev) => ({ ...prev, [quoteId]: "error" }));
      alert("❌ Failed to send quote to client.");
      setTimeout(() => {
        setSendingStates((prev) => ({ ...prev, [quoteId]: null }));
      }, 3000);
    }
  };

  if (loading) return <p>Loading your quotes...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📄 My Quotes</h2>
      {quotes.length === 0 ? (
        <p>No quotes found yet.</p>
      ) : (
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Quote ID</th>
              <th style={{ textAlign: "left" }}>Client</th>
              <th style={{ textAlign: "left" }}>Location/Address</th>
              <th style={{ textAlign: "left" }}>Date</th>
              <th style={{ textAlign: "left" }}>Total</th>
              <th style={{ textAlign: "left" }}>Viewed?</th>
              <th style={{ textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td>{quote.id}</td>
                <td>{quote.userEmail || quote.client?.email || "N/A"}</td>
                <td>{quote.location || quote.client?.address || "N/A"}</td>
                <td>
                  {quote.date
                    ? quote.date.toDate
                      ? quote.date.toDate().toLocaleDateString()
                      : new Date(quote.date).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>${quote.total ? Number(quote.total).toFixed(2) : "N/A"}</td>
                <td>{quote.viewed ? "✅ Yes" : "❌ No"}</td>
                <td>
                  <button
                    onClick={() =>
                      handleSendToClient(
                        quote.id,
                        quote.client?.email || quote.userEmail || auth.currentUser.email
                      )
                    }
                    disabled={sendingStates[quote.id] === "sending"}
                    style={{
                      padding: "0.5rem 1rem",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: sendingStates[quote.id] === "sending" ? "not-allowed" : "pointer",
                      backgroundColor:
                        sendingStates[quote.id] === "sending"
                          ? "#a0aec0"
                          : sendingStates[quote.id] === "sent"
                          ? "#48bb78"
                          : sendingStates[quote.id] === "error"
                          ? "#f56565"
                          : "#48bb78",
                    }}
                  >
                    {sendingStates[quote.id] === "sending"
                      ? "Sending..."
                      : sendingStates[quote.id] === "sent"
                      ? "✅ Sent"
                      : sendingStates[quote.id] === "error"
                      ? "❌ Error"
                      : "📧 Send to Client"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyQuotes;