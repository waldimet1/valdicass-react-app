import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import "./SalesDashboard.css";

const AppLayout = ({ children, pageTitle = "Dashboard" }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); // change to "/" if your login route is "/"
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Monitor auth state + pull custom claims
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      try {
        // Force refresh so we get the latest claims after /api/setAdmin
        const tokenResult = await currentUser.getIdTokenResult(true);
        setIsAdmin(!!tokenResult.claims.admin);
      } catch (error) {
        console.error("Error getting ID token result:", error);
        setIsAdmin(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const currentUserName = user?.displayName || user?.email || "User";
  const isActive = (path) => location.pathname === path;

  return (
    <div className="estimates-dashboard">
      {/* HEADER */}
      <div className="vd-header">
        <div className="vd-logo">
          <img
            src="/valdicass-logo.png"
            alt="Valdicass"
            style={{ height: 40 }}
          />
        </div>

        <div className="vd-main-content">
          <h1 className="vd-page-title">{pageTitle}</h1>
        </div>

        <div className="vd-header-right">
          {/* Notification Bell */}
          <div
            className="vd-notification-bell"
            onClick={() => navigate("/activity")}
            role="button"
            title="Activity"
          >
            🔔
          </div>

          {/* User Menu */}
          <div className="vd-user-menu">
            <div className="vd-user-avatar">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div className="vd-user-info">
              <div className="vd-user-name">{currentUserName}</div>
              <div className="vd-user-role">
                {isAdmin ? "Admin" : "Salesperson"}
              </div>
            </div>
          </div>

          {/* ✅ Logout Button */}
          <button
            onClick={handleLogout}
            className="vd-logout-btn"
            type="button"
          >
            Log out
          </button>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="vd-sidebar">
        <ul>
          <li
            onClick={() => navigate("/dashboard")}
            className={isActive("/dashboard") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">📊</span> Estimates
          </li>

          <li
            onClick={() => navigate("/schedule")}
            className={isActive("/schedule") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">📅</span> Schedule
          </li>

          <li
            onClick={() => navigate("/invoices")}
            className={isActive("/invoices") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">📄</span> Invoices
          </li>

          <li
            onClick={() => navigate("/clients")}
            className={isActive("/clients") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">👥</span> Clients
          </li>

          <li
            onClick={() => navigate("/items")}
            className={isActive("/items") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">📦</span> Items
          </li>

          <li
            onClick={() => navigate("/valdicass-pro")}
            className={isActive("/valdicass-pro") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">⭐</span> VC Pro
          </li>

          <li
            onClick={() => navigate("/project-google-reviews")}
            className={isActive("/project-google-reviews") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">⭐</span> Collect Google Reviews
          </li>

          <li
            onClick={() => navigate("/payments")}
            className={isActive("/payments") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">💳</span> Payments
          </li>

          <li
            onClick={() => navigate("/reports")}
            className={isActive("/reports") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">📈</span> Reports
          </li>

          <li
            onClick={() => navigate("/settings")}
            className={isActive("/settings") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">⚙️</span> Settings
          </li>

          <li
            onClick={() => navigate("/trash")}
            className={isActive("/trash") ? "active" : ""}
          >
            <span className="vd-sidebar-icon">🗑️</span> Trash
          </li>
        </ul>
      </div>

      {/* MAIN CONTENT */}
      <div className="vd-main">{children}</div>
    </div>
  );
};

export default AppLayout;
