// src/components/Header.jsx
import React, { forwardRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import NotificationBell from "./components/NotificationBell";
const Header = forwardRef((props, ref) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut(auth).then(() => navigate("/login"));
  };
{user && <NotificationBell user={user} />}
  return (
    <header ref={ref} style={styles.header}>
      <div style={styles.container}>
        <div style={styles.logoWrapper}>
          <img src="/valdicass-logo.png" alt="Valdicass Logo" style={styles.logoImage} />
          <span style={styles.logoText}>Valdicass Quoting</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>
    </header>
  );
});

const styles = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "80px",
    backgroundColor: "#004a99",
    color: "white",
    zIndex: 1000,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1rem",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  logoWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  logoImage: {
    height: "40px",
    width: "auto",
    maxWidth: "100%",
    objectFit: "contain",
  },
  logoText: {
    fontSize: "1.25rem",
    fontWeight: "bold",
  },
  logoutBtn: {
    backgroundColor: "#ff4d4d",
    color: "white",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default Header;

