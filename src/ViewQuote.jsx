// src/ViewQuote.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SignatureCanvas from "react-signature-canvas";

const ViewQuote = () => {
  const [searchParams] = useSearchParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typedName, setTypedName] = useState("");
const [signedImage, setSignedImage] = useState(null);
const sigCanvasRef = useRef();

  const quoteId = searchParams.get("id");

  useEffect(() => {
    const fetchQuote = async () => {
      if (!quoteId) return;

      try {
        const docRef = doc(db, "quotes", quoteId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const quoteData = docSnap.data();
          setQuote(quoteData);

          if (!quoteData.viewed) {
            await updateDoc(docRef, { viewed: true });

            await addDoc(collection(db, "notifications"), {
              type: "quote_opened",
              quoteId,
              salespersonUid: quoteData.createdBy || null,
              timestamp: new Date(),
            });

            await addDoc(collection(db, "quoteLogs"), {
              quoteId,
              openedAt: serverTimestamp(),
              openedBy: "client",
            });
            console.log("📦 Logged quote open event");

            toast.success("✅ Quote viewed and logged!", {
              position: "top-right",
              autoClose: 3000,
            });
          }
        } else {
          console.error("❌ Quote not found.");
        }
      } catch (err) {
        console.error("🔥 Error loading quote:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [quoteId]);

 const handleSignQuote = async () => {
  try {
    if (!typedName.trim() && sigCanvasRef.current?.isEmpty()) {
      toast.error("Please type your name or draw a signature.");
      return;
    }

    const signatureData = signedImage || typedName;

    const quoteRef = doc(db, "quotes", quoteId);
    await updateDoc(quoteRef, {
      signed: true,
      signedAt: new Date(),
      signature: signatureData,
    });

    await addDoc(collection(db, "notifications"), {
      type: "quote_signed",
      quoteId,
      timestamp: new Date(),
      salespersonUid: quote?.createdBy || null,
    });

    await fetch("https://valdicass-server.vercel.app/quoteSignedAlert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId }),
    });

    await fetch("https://valdicass-server.vercel.app/quoteSignedClientCopy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId }),
    });

    toast.success("✅ Thank you! Your quote has been signed.");
  } catch (error) {
    console.error("❌ Error signing quote:", error);
    toast.error("There was a problem signing your quote.");
  }
};


  if (loading) return <p>Loading quote...</p>;
  if (!quote) return <p>Quote not found.</p>;

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
        backgroundColor: "#f9f9f9",
        borderRadius: "12px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ color: "#004a99" }}>
        {quote.signed ? "✅ Quote Signed!" : "Thank you for viewing your quote!"}
      </h1>

      <p>
        <strong>Quote ID:</strong> {quoteId}
      </p>
      <p>
        <strong>Total:</strong> ${quote.total}
      </p>
      <p>
        <strong>Location:</strong> {quote.location}
      </p>
      <p>
        <strong>Product:</strong> {quote.material} {quote.series} {quote.style} Window
      </p>

      {/* Optional PDF display */}
      {/* <iframe src={quote.pdfUrl} width="100%" height="500px" title="Quote PDF" /> */}
<div style={{ marginTop: "2rem", textAlign: "left" }}>
  <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
    Type your full name:
  </label>
  <input
    type="text"
    value={typedName}
    onChange={(e) => setTypedName(e.target.value)}
    style={{
      width: "100%",
      padding: "0.5rem",
      fontSize: "1rem",
      borderRadius: "6px",
      border: "1px solid #ccc",
      marginBottom: "1rem",
    }}
  />

  <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
    Or draw your signature:
  </label>
  <SignatureCanvas
    ref={sigCanvasRef}
    penColor="#000"
    canvasProps={{
      width: 500,
      height: 150,
      className: "sigCanvas",
      style: {
        border: "1px solid #ccc",
        borderRadius: "6px",
        width: "100%",
      },
    }}
    onEnd={() => {
      const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");
      setSignedImage(dataUrl);
    }}
  />
  <button
    type="button"
    onClick={() => {
      sigCanvasRef.current.clear();
      setSignedImage(null);
    }}
    style={{
      marginTop: "0.5rem",
      padding: "0.5rem 1rem",
      backgroundColor: "#ddd",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    }}
  >
    Clear Signature
  </button>
</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
  {!quote.signed && (
    <button
      onClick={handleSignQuote}
      style={{
        backgroundColor: "#28a745",
        color: "white",
        padding: "1rem",
        fontSize: "1rem",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
      }}
    >
      ✅ Sign This Quote
    </button>
  )}

  <button
    onClick={() => (window.location.href = "/")}
    style={{
      backgroundColor: "#004a99",
      color: "white",
      padding: "1rem",
      fontSize: "1rem",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
    }}
  >
    🔙 Return to Dashboard
  </button>
</div>


      <ToastContainer />
    </div>
  );
};

export default ViewQuote;
