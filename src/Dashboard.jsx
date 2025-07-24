// src/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { toast } from "react-toastify";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "./firebaseConfig";

/* Spinner CSS */
const spinnerStyle = {
  margin: "2rem auto",
  border: "6px solid #f3f3f3",
  borderTop: "6px solid #004a99",
  borderRadius: "50%",
  width: "40px",
  height: "40px",
  animation: "spin 1s linear infinite",
};

const keyframesStyle = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inject spinner animation keyframes
  useEffect(() => {
    const styleTag = document.createElement("style");
    styleTag.innerHTML = keyframesStyle;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchLogs = async () => {
      if (!user) return;
      setLoading(true);
      const q = query(
        collection(db, "quoteLogs"),
        where("sentById", "==", user.uid),
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (isMounted) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSendQuote = async () => {
    const quoteId = prompt("Enter Quote ID:");
    const clientEmail = prompt("Enter Client Email:");

    if (!quoteId || !clientEmail || !user) {
      alert("Missing fields or not logged in.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const createdBy = user.uid;

      await axios.post(
        "http://localhost:5001/sendQuoteEmail",
        {
          quoteId: quoteId.trim(),
          clientEmail: clientEmail.trim(),
          createdBy,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("✅ Quote sent successfully!");
    } catch (error) {
      console.error("🔥 Error:", error.response?.data || error.message);
      toast.error("❌ Failed to send quote to client.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "center" }}>
      <h1>Valdicass - Send Quote</h1>
      <p>✅ Logged in as: <strong>{user.email}</strong></p>

      <button
        onClick={() => navigate("/my-quotes")}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#eee",
          border: "1px solid #ccc",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        📋 My Sent Quotes
      </button>

      <button
        onClick={handleSendQuote}
        style={{
          padding: "1rem 2rem",
          backgroundColor: "#004a99",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "1rem",
          marginTop: "1rem",
        }}
      >
        🚀 Send Quote to Client
      </button>

      <br />

      <button
        onClick={handleLogout}
        style={{
          marginTop: "1rem",
          background: "none",
          color: "#004a99",
          border: "none",
          cursor: "pointer",
        }}
      >
        🔒 Log Out
      </button>

      <div
        style={{
          margin: "2rem auto",
          padding: "1rem",
          maxWidth: "600px",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ marginBottom: "1rem", color: "#004a99" }}>
          📜 Quote Send History
        </h2>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={spinnerStyle}></div>
          </div>
        ) : logs.length === 0 ? (
          <p style={{ fontStyle: "italic" }}>No quotes sent yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {logs.map((log) => (
              <li
                key={log.id}
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid #ddd",
                  textAlign: "left",
                }}
              >
                <strong>Quote:</strong> {log.quoteId} <br />
                <strong>Sent To:</strong> {log.sentTo} <br />
                <strong>Date:</strong>{" "}
                {log.timestamp?.toDate().toLocaleString() || "Pending..."}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
