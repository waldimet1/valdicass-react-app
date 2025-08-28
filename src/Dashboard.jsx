// src/Dashboard.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import "./styles/buttons.css";
import valdicassLogo from "./assets/valdicass-logo.png";
import greenskyLogo from "./assets/greensky-logo.jpeg"; // use .jpg if that's your actual file

// Styles (hoisted outside component so they're not recreated on every render)
const btn = {
  padding: "0.75rem 1.5rem",
  borderRadius: "8px",
  cursor: "pointer",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
  color: "#111827",
};

const primary = {
  ...btn,
  backgroundColor: "#004a99",
  color: "#fff",
  border: "none",
};

const pill = {
  padding: "0.5rem 1rem",
  borderRadius: "999px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  color: "#111827",
};

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();
  const go = (path) => () => navigate(path);

  useEffect(() => {
    document.title = "Valdicass - Estimates";
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "neuropol", textAlign: "center" }}>
      

      {/* Logos row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          marginTop: 6,
          marginBottom: 18,
        }}
      >
        <img src={valdicassLogo} alt="Valdicass" style={{ height: 42, objectFit: "contain" }} />
      </div>
<h1>Valdicass - Estimates</h1>
      <p>
        ✅ Logged in as: <strong>{user?.email}</strong>
      </p>

      {/* main actions */}
      <div style={{ marginTop: "2rem" }}>
        <button onClick={go("/quotes/all")} style={{ ...btn, marginRight: "1rem", backgroundColor: "#eee" }}>
          📋 My Sent Quotes
        </button>

        <button onClick={go("/estimate")} style={primary}>
          ➕ Start New Estimate
        </button>
      </div>

      {/* quick filters row */}
      <div
        style={{
          marginTop: "1.25rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          justifyContent: "center",
        }}
      >
        <button onClick={go("/quotes/all")} style={pill}>All</button>
        <button onClick={go("/quotes/sent")} style={pill}>Sent</button>
        <button onClick={go("/quotes/viewed")} style={pill}>Viewed</button>
        <button onClick={go("/quotes/signed")} style={pill}>Signed</button>
        <button onClick={go("/quotes/declined")} style={pill}>Declined</button>
      </div>

      <button
        onClick={handleLogout}
        style={{ marginTop: "2rem", background: "none", color: "#004a99", border: "none", cursor: "pointer" }}
      >
        🔒 Log Out
      </button>

      {/* Footer GreenSky logo */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
        <img
          src={greenskyLogo}
          alt="GreenSky Financing"
          style={{ height: 28, objectFit: "contain", opacity: 0.95 }}
        />
      </div>
    </div>
  );
};

export default Dashboard;



