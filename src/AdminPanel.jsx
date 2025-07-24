// src/AdminPanel.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminPanel = () => {
  const [quotes, setQuotes] = useState([]);
  const [pricing, setPricing] = useState({});
  const [loadingPricing, setLoadingPricing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setPricing(snap.data());
        }
      } catch (err) {
        console.error("Error loading pricing:", err);
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchPricing();
  }, []);

  const handlePricingChange = (field, value) => {
    setPricing((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePricing = async () => {
    try {
      await updateDoc(doc(db, "settings", "pricing"), pricing);
      toast.success("✅ Pricing saved!");
    } catch (err) {
      console.error("Error saving pricing:", err);
      toast.error("❌ Failed to save pricing.");
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "quotes"), (snapshot) => {
      const allQuotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuotes(allQuotes);
    });

    return () => unsubscribe();
  }, []);

  const handleView = (quoteId) => navigate(`/view?id=${quoteId}`);

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        maxWidth: "1000px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ color: "#004a99", marginBottom: "1rem" }}>
        🛠 Admin Panel: All Quotes
      </h1>

      <h2 style={{ marginTop: "1rem", color: "#004a99" }}>💲 Manage Pricing</h2>

      {loadingPricing ? (
        <p>Loading pricing...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
            maxWidth: "400px",
            marginBottom: "2rem",
          }}
        >
          {Object.keys(pricing).map((key) => (
            <div key={key}>
              <label style={{ fontWeight: "bold" }}>{key}:</label>
              <input
                type="number"
                value={pricing[key]}
                onChange={(e) =>
                  handlePricingChange(key, parseFloat(e.target.value))
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                }}
              />
            </div>
          ))}
          <button
            onClick={handleSavePricing}
            style={{
              backgroundColor: "#28a745",
              color: "white",
              padding: "0.6rem 1.2rem",
              fontSize: "1rem",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            💾 Save Pricing
          </button>
        </div>
      )}

      {quotes.length === 0 ? (
        <p>No quotes available.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.95rem",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#eaf2fb", textAlign: "left" }}>
              <th style={{ padding: "0.75rem" }}>Client</th>
              <th>Total</th>
              <th>Status</th>
              <th>Location</th>
              <th>Material</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "0.75rem" }}>
                  {q.client?.name || "N/A"}
                </td>
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
                <td>{`${q.material || ""} ${q.series || ""} ${
                  q.style || ""
                }`}</td>
                <td>{q.createdBy || "Unknown"}</td>
                <td>
                  <button
                    onClick={() => handleView(q.id)}
                    style={{
                      backgroundColor: "#004a99",
                      color: "white",
                      padding: "0.4rem 0.8rem",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    View
                  </button>
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

export default AdminPanel;


