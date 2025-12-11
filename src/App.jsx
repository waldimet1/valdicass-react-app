// src/App.jsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { auth } from "./firebaseConfig";

// Real pages you already have
import SalesDashboard from "./SalesDashboard";
import Dashboard from "./Dashboard";
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
import Schedule from "./pages/Schedule";
import Invoices from './pages/Invoices';
import AppointmentResponse from "./pages/AppointmentResponse";
import Clients from "./pages/Clients";
import AppLayout from './AppLayout';
import NewEstimate from './pages/NewEstimate';
import Settings from './pages/Settings';
import Templates from './pages/Templates';

// ADD THIS HELPER FUNCTION
const withLayout = (Component, pageTitle) => {
  return (
    <AppLayout pageTitle={pageTitle}>
      <Component />
    </AppLayout>
  );
};

const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2";

// Placeholder pages for navigation items
const InvoicesPage = () => (
  <div style={{ padding: "40px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
    <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>📄 Invoices</h1>
    <p style={{ color: "#666", fontSize: "18px" }}>Coming soon! This page will manage your invoices.</p>
  </div>
);


const ItemsPage = () => (
  <div style={{ padding: "40px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
    <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>📦 Items Catalog</h1>
    <p style={{ color: "#666", fontSize: "18px" }}>Coming soon! Your windows & doors product catalog.</p>
  </div>
);

const ValdicassProPage = () => (
  <div style={{ padding: "40px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
    <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>⭐ VC Pro</h1>
    <p style={{ color: "#666", fontSize: "18px" }}>Coming soon! Premium features and advanced tools.</p>
  </div>
);

const GoogleReviewsPage = () => (
  <div style={{ padding: "40px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
    <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>⭐⭐⭐⭐⭐ Google Reviews</h1>
    <p style={{ color: "#666", fontSize: "18px" }}>Coming soon! Manage project reviews and testimonials.</p>
  </div>
);

const PaymentsPage = () => (
  <div style={{ padding: "40px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
    <h1 style={{ fontSize: "32px", marginBottom: "16px" }}>💳 Payments</h1>
    <p style={{ color: "#666", fontSize: "18px" }}>Coming soon! Track payments and billing.</p>
  </div>
);


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

        {/* Main Dashboard */}
        <Route path="/dashboard" element={requireAuth(<SalesDashboard />)} />

        {/* Navigation Menu Pages */}
        <Route path="/schedule" element={requireAuth(withLayout(Schedule, "Schedule"))} />
        <Route path="/invoices" element={requireAuth(withLayout(Invoices, "Invoices"))} />
        <Route path="/clients" element={requireAuth(withLayout(Clients, "Clients"))} /> 
        <Route path="/items" element={requireAuth(withLayout(ItemsPage, "Items"))} />
        <Route path="/valdicass-pro" element={requireAuth(withLayout(ValdicassProPage, "VC Pro"))} />
        <Route path="/project-google-reviews" element={requireAuth(withLayout(GoogleReviewsPage, "Google Reviews"))} />
        <Route path="/payments" element={requireAuth(withLayout(PaymentsPage, "Payments"))} />
        <Route path="/reports" element={requireAuth(withLayout(Reports, "Reports"))} />
        <Route path="/settings" element={requireAuth(withLayout(Settings, "Settings"))} />
        <Route path="/estimate/new" element={requireAuth(withLayout(NewEstimate, "New Estimate"))} />
        <Route path="/estimate/edit/:id" element={requireAuth(withLayout(NewEstimate, "Edit Estimate"))} />
        <Route path="/templates" element={requireAuth(withLayout(Templates, "Templates"))} />
        <Route path="/new" element={<Navigate to="/estimate/new" replace />} />
        {/* Optional legacy dashboards */}
        <Route path="/new" element={<Navigate to="/estimate/new" replace />} />
        <Route
          path="/edit"
          element={
            (() => {
              const EditRedirect = () => {
                const id = new URLSearchParams(window.location.search).get("id");
                return <Navigate to={id ? `/estimate/edit/${id}` : "/estimate/new"} replace />;
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

        {/* Quotes */}
        <Route path="/quotes" element={<Navigate to="/quotes/all" replace />} />
        <Route path="/quotes/:filter" element={requireAuth(<QuotesPage />)} />
        <Route path="/in-progress" element={<Navigate to="/quotes/pending" replace />} />
        <Route path="/signed" element={<Navigate to="/quotes/signed" replace />} />

        {/* Create / read / actions */}
        <Route path="/my-quotes" element={requireAuth(<MyQuotes />)} />
        <Route path="/quote/:id" element={requireAuth(<QuoteDetail />)} />
        <Route path="/activity" element={requireAuth(<Activity />)} />

        
        {/* Public customer flows (no auth) */}
<Route path="/appointment-response" element={<AppointmentResponse />} />
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