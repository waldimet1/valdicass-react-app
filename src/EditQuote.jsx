// src/EditQuote.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  getDoc,
  updateDoc,
  doc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const EditQuote = () => {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("id");
  const navigate = useNavigate();

  const [location, setLocation] = useState("");
  const [material, setMaterial] = useState("");
  const [series, setSeries] = useState("");
  const [style, setStyle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [total, setTotal] = useState("");
  const [pricing, setPricing] = useState({});
  const [quoteData, setQuoteData] = useState(null);

  // Fetch quote data
  useEffect(() => {
    const fetchQuote = async () => {
      if (!quoteId) return;

      const docRef = doc(db, "quotes", quoteId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setQuoteData(data);
        setLocation(data.location || "");
        setMaterial(data.material || "");
        setSeries(data.series || "");
        setStyle(data.style || "");
        setQuantity(data.quantity || 1);
      } else {
        toast.error("❌ Quote not found.");
      }
    };

    const fetchPricing = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setPricing(snap.data());
        }
      } catch (err) {
        console.error("Error loading pricing:", err);
      }
    };

    fetchQuote();
    fetchPricing();
  }, [quoteId]);

  // Recalculate total when inputs change
  useEffect(() => {
    if (!material || !series || !style || !pricing[material]?.[series]?.[style]) {
      setTotal("0.00");
      return;
    }

    const unitPrice = pricing[material][series][style];
    setTotal((unitPrice * quantity).toFixed(2));
  }, [material, series, style, quantity, pricing]);

  const handleUpdate = async () => {
    if (!quoteId) return;

    const docRef = doc(db, "quotes", quoteId);

    // Save previous version
    await addDoc(collection(docRef, "quoteVersions"), {
      ...quoteData,
      versionSavedAt: serverTimestamp(),
    });

    await updateDoc(docRef, {
      location,
      material,
      series,
      style,
      quantity,
      total,
      lastEditedAt: serverTimestamp(),
    });

    toast.success("✅ Quote updated!");
    navigate("/dashboard");
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#004a99", marginBottom: "1.5rem" }}>✏️ Edit Quote</h1>

      <div style={fieldWrapper}>
        <label>Location:</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
      </div>

      <div style={fieldWrapper}>
        <label>Material:</label>
        <input value={material} onChange={(e) => setMaterial(e.target.value)} style={inputStyle} />
      </div>

      <div style={fieldWrapper}>
        <label>Series:</label>
        <input value={series} onChange={(e) => setSeries(e.target.value)} style={inputStyle} />
      </div>

      <div style={fieldWrapper}>
        <label>Style:</label>
        <input value={style} onChange={(e) => setStyle(e.target.value)} style={inputStyle} />
      </div>

      <div style={fieldWrapper}>
        <label>Quantity:</label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          style={inputStyle}
        />
      </div>

      <div style={fieldWrapper}>
        <label>Total ($):</label>
        <input value={total} readOnly style={inputStyle} />
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
        <button onClick={handleUpdate} style={buttonStyle}>
          💾 Save Changes
        </button>
        <button onClick={() => navigate("/dashboard")} style={cancelButtonStyle}>
          ❌ Cancel
        </button>
      </div>

      <ToastContainer />
    </div>
  );
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "0.5rem",
  fontSize: "1rem",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const fieldWrapper = {
  marginBottom: "1.25rem",
};

const buttonStyle = {
  backgroundColor: "#28a745",
  color: "white",
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const cancelButtonStyle = {
  backgroundColor: "#ccc",
  color: "#333",
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default EditQuote;


