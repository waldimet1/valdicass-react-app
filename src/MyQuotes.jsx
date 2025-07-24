// src/MyQuotes.jsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { auth } from "./firebaseConfig";

const MyQuotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotes = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(collection(db, "quotes"), where("userID", "==", user.uid));
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

  if (loading) return <p>Loading your sent quotes...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📄 My Sent Quotes</h2>
      {quotes.length === 0 ? (
        <p>No quotes sent yet.</p>
      ) : (
        <table style={{ width: "100%", marginTop: "1rem", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Quote ID</th>
              <th align="left">Client</th>
              <th align="left">Location</th>
              <th align="left">Total</th>
              <th align="left">Viewed?</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td>{quote.id}</td>
                <td>{quote.userEmail || "N/A"}</td>
                <td>{quote.location}</td>
                <td>${quote.total}</td>
                <td>{quote.viewed ? "✅ Yes" : "❌ No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyQuotes;
