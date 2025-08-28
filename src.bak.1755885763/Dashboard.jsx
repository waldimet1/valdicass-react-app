// src/Dashboard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";

const Dashboard = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "center" }}>
      <h1>Valdicass - Send Quote</h1>
      <p>✅ Logged in as: <strong>{user.email}</strong></p>

      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={() => navigate("/my-quotes")}
          style={{
            padding: "0.75rem 1.5rem",
            marginRight: "1rem",
            backgroundColor: "#eee",
            border: "1px solid #ccc",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          📋 My Sent Quotes
        </button>

        <button
          onClick={() => navigate("/estimate")}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#004a99",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          ➕ Start New Estimate
        </button>
      </div>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "2rem",
          background: "none",
          color: "#004a99",
          border: "none",
          cursor: "pointer",
        }}
      >
        🔒 Log Out
      </button>
    </div>
  );
};
// force update

export default Dashboard;

