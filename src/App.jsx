// src/App.jsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { auth } from "./firebaseConfig";

// Real pages you already have
import QuoteDashboardModern from "./pages/QuoteDashboardModern";
import Dashboard from "./Dashboard"; // kept as legacy/optional route
import AdminPanel from "./AdminPanel";
import AuthForm from "./AuthForm";
import SalesDashboardLiveTest from "./SalesDashboardLiveTest";
import DeclineQuote from "./DeclineQuote";
import ViewQuote from "./ViewQuote";
import MyQuotes from "./MyQuotes";
import EstimateForm from "./EstimateForm";
import QuoteDetail from "./QuoteDetail";
import SignQuote from "./SignQuote";
import QuotesPage from "./QuotesPage";
import EnvDiagnostics from "./pages/EnvDiagnostics";
import Reports from "./pages/Reports";
import Activity from "./pages/Activity";


const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2";

// Safe placeholders that won't collide with your real imports
const ReportsPage  = () => <div style={{ padding: 24 }}>📊 Reports — coming soon</div>;
const SettingsPage = () => <div style={{ padding: 24 }}>⚙️ Settings — coming soon</div>;

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: 100 }}>🔄 Loading...</div>;
  }

  const requireAuth = (element) => (user ? element : <Navigate to="/" replace />);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Auth gate on home */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <AuthForm onAuthSuccess={setUser} />}
        />

        {/* Modern dashboard */}
        <Route path="/dashboard" element={<QuoteDashboardModern user={user} />} />

        {/* Optional legacy dashboards */}
        <Route path="/new" element={<Navigate to="/estimate" replace />} />
<Route
  path="/edit"
  element={
    (() => {
      const EditRedirect = () => {
        const id = new URLSearchParams(window.location.search).get("id");
        return <Navigate to={id ? `/estimate/${id}` : "/estimate"} replace />;
      };
      return <EditRedirect />;
    })()
  }
/>
        <Route
          path="/legacy-dashboard"
          element={requireAuth(<Dashboard user={user} setUser={setUser} />)}
        />
        <Route
          path="/sales-dashboard"
          element={requireAuth(<SalesDashboardLiveTest user={user} setUser={setUser} />)}
        />

        {/* Left-rail destinations */}
        <Route path="/quotes" element={<Navigate to="/quotes/all" replace />} />
        <Route path="/quotes/:filter" element={requireAuth(<QuotesPage />)} />
        <Route path="/in-progress" element={<Navigate to="/quotes/pending" replace />} />
        <Route path="/signed"      element={<Navigate to="/quotes/signed" replace />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={requireAuth(<SettingsPage />)} />
<Route path="/" element={<Dashboard user={user} setUser={setUser} />} />

        {/* Create / read / actions */}
       <Route path="/estimate" element={requireAuth(<EstimateForm />)} />
       <Route path="/estimate/:id" element={requireAuth(<EstimateForm />)} />
        <Route path="/new" element={requireAuth(<EstimateForm />)} />
        <Route path="/my-quotes" element={requireAuth(<MyQuotes />)} />
        <Route path="/quote/:id" element={requireAuth(<QuoteDetail />)} />
<Route path="/activity" element={<Activity />} />

        {/* Public customer flows (no auth) */}
        <Route path="/view-quote" element={<ViewQuote />} />
        <Route path="/sign" element={<SignQuote />} />
        <Route path="/decline" element={<DeclineQuote />} />

        {/* Diagnostics */}
        <Route path="/debug/env" element={requireAuth(<EnvDiagnostics />)} />

        {/* Admin */}
        <Route
          path="/admin"
          element={user?.uid === ADMIN_UID ? <AdminPanel /> : <Navigate to="/" replace />}
        />

        {/* Catch-all LAST */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}














