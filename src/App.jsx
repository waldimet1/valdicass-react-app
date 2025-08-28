// src/App.jsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Dashboard from "./Dashboard";
import AdminPanel from "./AdminPanel";
import AuthForm from "./AuthForm";
import SalesDashboardLiveTest from "./SalesDashboardLiveTest";
import DeclineQuote from "./DeclineQuote";
import ViewQuote from "./ViewQuote";
import MyQuotes from "./MyQuotes";
import EstimateForm from "./EstimateForm";
import QuoteDetail from "./QuoteDetail";
import { auth } from "./firebaseConfig";
import SignQuote from "./SignQuote";
import QuotesPage from "./QuotesPage";
import EnvDiagnostics from "./pages/EnvDiagnostics";

const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2";

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

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Auth gate on home */}
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" replace /> : <AuthForm onAuthSuccess={setUser} />}
        />

        {/* Choose ONE main dashboard for /dashboard */}
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/" replace />}
        />
        {/* If you still want to keep the Live Test dashboard, give it its own path */}
        <Route
          path="/sales-dashboard"
          element={user ? <SalesDashboardLiveTest user={user} setUser={setUser} /> : <Navigate to="/" replace />}
        />

        {/* Quotes listing with filters */}
        <Route path="/quotes" element={<Navigate to="/quotes/all" replace />} />
        <Route path="/quotes/:filter" element={<QuotesPage />} />

        {/* Creating / reading / actions */}
        <Route path="/estimate" element={<EstimateForm />} />
        <Route path="/new" element={<EstimateForm />} />
        <Route path="/my-quotes" element={<MyQuotes />} />
        <Route path="/quote/:id" element={<QuoteDetail />} />
        <Route path="/view-quote" element={<ViewQuote />} />
        <Route path="/sign" element={<SignQuote />} />
        <Route path="/decline" element={<DeclineQuote />} />
        <Route path="/debug/env" element={<EnvDiagnostics />} />

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












