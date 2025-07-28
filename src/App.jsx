import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AdminPanel from "./AdminPanel";
import AuthForm from "./AuthForm";
import Dashboard from "./Dashboard";
import ViewQuote from "./ViewQuote";
import MyQuotes from "./MyQuotes";
import EstimateForm from "./EstimateForm";


import QuoteDetail from "./QuoteDetail";
import { auth } from "./firebaseConfig";

const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2"; // ✅ replace with your actual UID

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // ✅ stop loading after auth resolves
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "100px" }}>🔄 Loading...</div>;
  }

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Root route */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" /> : <AuthForm onAuthSuccess={setUser} />
          }
        />

        {/* Dashboard route */}
        <Route
          path="/dashboard"
          element={
            user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/" />
          }
        />

        {/* Other routes */}
        <Route path="/view-quote" element={<ViewQuote />} />
        <Route path="/my-quotes" element={<MyQuotes />} />
        <Route path="/estimate" element={<EstimateForm />} />
        <Route path="/quote/:id" element={<QuoteDetail />} />
        <Route
          path="/admin"
          element={
            user?.uid === ADMIN_UID ? <AdminPanel /> : <Navigate to="/" />
          }
        />
      </Routes>
    </Router>
  );
};

export default App;







