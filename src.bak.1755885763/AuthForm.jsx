import React, { useState } from "react";
import { auth } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

const AuthForm = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const userCred = isLogin
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);
      onAuthSuccess(userCred.user);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      alert("Please enter your email to reset password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("✅ Password reset link sent. Check your inbox.");
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  return (
    <form onSubmit={handleAuth} style={{ textAlign: "center", marginTop: "2rem" }}>
      <h2>{isLogin ? "Login" : "Sign Up"}</h2>
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ padding: "0.5rem", marginBottom: "0.5rem" }}
      />
      <br />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={{ padding: "0.5rem", marginBottom: "0.5rem" }}
      />
      <br />
      <button type="submit" style={{ padding: "0.5rem 1rem" }}>
        {isLogin ? "Login" : "Create Account"}
      </button>
      <p
        onClick={() => setIsLogin(!isLogin)}
        style={{ cursor: "pointer", marginTop: "1rem", color: "#004a99" }}
      >
        {isLogin ? "Need to sign up?" : "Already have an account?"}
      </p>
      {isLogin && (
        <p
          onClick={handleResetPassword}
          style={{ cursor: "pointer", marginTop: "0.5rem", color: "#004a99" }}
        >
          Forgot Password?
        </p>
      )}
    </form>
  );
};

export default AuthForm;

