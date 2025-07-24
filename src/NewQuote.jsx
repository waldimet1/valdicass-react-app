// src/NewQuote.jsx
import React, { useState, useEffect } from "react";
import { db, auth } from "./firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";

const NewQuote = () => {
  const [location, setLocation] = useState("");
  const [material, setMaterial] = useState("");
  const [series, setSeries] = useState("");
  const [style, setStyle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [total, setTotal] = useState(0);
  const [pricing, setPricing] = useState({});
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
        console.error("Failed to fetch pricing:", err);
        toast.error("❌ Error loading pricing.");
      }
    };

    fetchPricing();
  }, []);

  useEffect(() => {
  if (!material || !series || !style) {
    setTotal("0.00");
    return;
  }

  const unitPrice = pricing?.[material]?.[series]?.[style] || 0;
  setTotal((unitPrice * quantity).toFixed(2));
}, [material, series, style, quantity, pricing]);


  const handleSubmit = async () => {
    if (!location || !material || !series || !style || !quantity || !total) {
      toast.error("⚠️ Please complete all fields.");
      return;
    }

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "quotes"), {
        location,
        material,
        series,
        style,
        quantity,
        total,
        createdBy: user?.uid || "unknown",
        createdAt: serverTimestamp(),
      });

      toast.success("✅ Quote created!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error saving quote:", err);
      toast.error("❌ Failed to save quote.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#004a99" }}>📝 New Quote</h1>

      <label>Location</label>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={inputStyle}
      />

      <label>Material</label>
      <input
        value={material}
        onChange={(e) => setMaterial(e.target.value)}
        style={inputStyle}
      />

      <label>Series</label>
      <input
        value={series}
        onChange={(e) => setSeries(e.target.value)}
        style={inputStyle}
      />

      <label>Style</label>
      <input
        value={style}
        onChange={(e) => setStyle(e.target.value)}
        style={inputStyle}
      />

      <label>Quantity</label>
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
        style={inputStyle}
      />

      <p><strong>Total:</strong> {total > 0 ? `$${total}` : "–"}</p>

      <button onClick={handleSubmit} style={buttonStyle}>
        💾 Save Quote
      </button>

      <ToastContainer />
    </div>
  );
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "0.5rem",
  marginBottom: "1rem",
  fontSize: "1rem",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const buttonStyle = {
  backgroundColor: "#004a99",
  color: "white",
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default NewQuote;

