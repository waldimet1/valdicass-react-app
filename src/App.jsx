// src/App.jsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AdminPanel from "./AdminPanel";
import AuthForm from "./AuthForm";
import Dashboard from "./Dashboard";
import ViewQuote from "./ViewQuote";
import MyQuotes from "./MyQuotes";
import { auth } from "./firebaseConfig";
import EstimateForm from "./EstimateForm";
import QuoteDetail from "./QuoteDetail";

const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2"; // 🔁 Replace with your actual UID

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />

      <Routes>
  <Route
    path="/"
    element={
      !user ? (
        <AuthForm onAuthSuccess={setUser} />
      ) : (
        <Dashboard user={user} setUser={setUser} />
      )
    }
  />
  
 <Route path="/dashboard" element={<Dashboard user={user} setUser={setUser} />} />


  <Route path="/view-quote" element={<ViewQuote />} />
  <Route path="/my-quotes" element={<MyQuotes />} />
  <Route path="/estimate" element={<EstimateForm />} />
  <Route path="/quote/:id" element={<QuoteDetail />} />
  <Route
    path="/admin"
    element={
      user?.uid === ADMIN_UID ? (
        <AdminPanel />
      ) : (
        <Navigate to="/" />
      )
    }
  />
</Routes>

    </Router>
  );
};

export default App;






