import React, { useState } from "react";
import { collection, addDoc, serverTimestamp, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";

const TestDataGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedCount, setGeneratedCount] = useState(0);

  // Sample data for realistic estimates
  const sampleClients = [
    { name: "Tiffany & Ollie Lee", address: "225 Wood Glen Lane", city: "Oak Brook", zip: "60523" },
    { name: "Brad Burjan", address: "17 Catherine Ave", city: "La Grange", zip: "60525" },
    { name: "Frank Cosgrave", address: "745 S. 6th Ave", city: "La Grange", zip: "60525" },
    { name: "Jeffrey Simpson", address: "4206 Vernon Ave", city: "Brookfield", zip: "60513" },
    { name: "Simon Boaler", address: "7 N. Wright Street", city: "Naperville", zip: "60540" },
    { name: "Justin Hays", address: "2145 Hull Court", city: "Naperville", zip: "60564" },
    { name: "Maria Rodriguez", address: "890 Elm Street", city: "Downers Grove", zip: "60515" },
    { name: "John & Sarah Mitchell", address: "456 Oak Avenue", city: "Western Springs", zip: "60558" },
    { name: "David Chen", address: "123 Maple Drive", city: "Hinsdale", zip: "60521" },
    { name: "Emily Johnson", address: "789 Pine Road", city: "Clarendon Hills", zip: "60514" },
  ];

  const windowTypes = [
    "Double Hung Windows",
    "Casement Windows",
    "Sliding Windows",
    "Bay Windows",
    "Picture Windows",
    "Awning Windows",
  ];

  const doorTypes = [
    "Entry Door",
    "Patio Door",
    "French Door",
    "Storm Door",
    "Sliding Glass Door",
  ];

  // Generate random date within last 3 months
  const getRandomDate = () => {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 90); // 0-90 days ago
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date;
  };

  // Generate estimate number (241XXX format)
  const generateEstimateNumber = (index) => {
    return `241${(140 + index).toString().padStart(3, "0")}`;
  };

  const generateSampleEstimate = (index, statusOverride = null) => {
    const client = sampleClients[index % sampleClients.length];
    const numWindows = Math.floor(Math.random() * 8) + 2; // 2-10 windows
    const numDoors = Math.floor(Math.random() * 3) + 1; // 1-3 doors
    
    const windowPrice = (Math.random() * 800 + 400) * numWindows; // $400-1200 per window
    const doorPrice = (Math.random() * 2000 + 1000) * numDoors; // $1000-3000 per door
    const total = Math.round((windowPrice + doorPrice) * 100) / 100;

    const statuses = ["PENDING", "PENDING", "PENDING", "APPROVED", "DECLINED"]; // More pending
    const status = statusOverride || statuses[Math.floor(Math.random() * statuses.length)];

    const date = getRandomDate();

    return {
      clientName: client.name,
      address: client.address,
      city: client.city,
      zip: client.zip,
      estimateNumber: generateEstimateNumber(index),
      poNumber: Math.random() > 0.5 ? `PO${Math.floor(Math.random() * 9000) + 1000}` : "",
      status: status,
      total: total,
      
      // Items breakdown
      items: [
        {
          type: "window",
          description: windowTypes[Math.floor(Math.random() * windowTypes.length)],
          quantity: numWindows,
          unitPrice: Math.round((windowPrice / numWindows) * 100) / 100,
          total: Math.round(windowPrice * 100) / 100,
        },
        {
          type: "door",
          description: doorTypes[Math.floor(Math.random() * doorTypes.length)],
          quantity: numDoors,
          unitPrice: Math.round((doorPrice / numDoors) * 100) / 100,
          total: Math.round(doorPrice * 100) / 100,
        },
      ],

      // Email tracking
      emailSent: status !== "PENDING" || Math.random() > 0.3,
      emailOpened: status === "APPROVED" || (status === "DECLINED" && Math.random() > 0.5),
      
      // Metadata
      createdBy: auth.currentUser?.uid || "test-user",
      createdAt: date,
      updatedAt: date,
      isTemplate: false,
      
      // Optional fields
      notes: Math.random() > 0.7 ? "Customer requested premium upgrade" : "",
      discount: Math.random() > 0.8 ? Math.round(total * 0.1) : 0,
    };
  };

  const generateTestData = async (count = 10) => {
    if (!auth.currentUser) {
      setMessage("❌ You must be logged in to generate test data!");
      return;
    }

    setLoading(true);
    setMessage(`🔄 Generating ${count} test estimates...`);
    
    try {
      const promises = [];
      
      for (let i = 0; i < count; i++) {
        const estimate = generateSampleEstimate(i);
        promises.push(
          addDoc(collection(db, "quotes"), estimate)
        );
      }

      await Promise.all(promises);
      
      setGeneratedCount(prev => prev + count);
      setMessage(`✅ Successfully created ${count} test estimates!`);
      setLoading(false);
    } catch (error) {
      console.error("Error generating test data:", error);
      setMessage(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  const generateByStatus = async (status, count = 3) => {
    if (!auth.currentUser) {
      setMessage("❌ You must be logged in!");
      return;
    }

    setLoading(true);
    setMessage(`🔄 Generating ${count} ${status} estimates...`);
    
    try {
      const promises = [];
      
      for (let i = 0; i < count; i++) {
        const estimate = generateSampleEstimate(generatedCount + i, status);
        promises.push(
          addDoc(collection(db, "quotes"), estimate)
        );
      }

      await Promise.all(promises);
      
      setGeneratedCount(prev => prev + count);
      setMessage(`✅ Successfully created ${count} ${status} estimates!`);
      setLoading(false);
    } catch (error) {
      console.error("Error generating test data:", error);
      setMessage(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  const clearAllTestData = async () => {
    if (!auth.currentUser) {
      setMessage("❌ You must be logged in!");
      return;
    }

    const confirmed = window.confirm(
      "⚠️ This will delete ALL quotes created by you. Are you sure?"
    );
    
    if (!confirmed) return;

    setLoading(true);
    setMessage("🔄 Deleting all your test data...");
    
    try {
      const q = query(
        collection(db, "quotes"),
        where("createdBy", "==", auth.currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      
      await Promise.all(deletePromises);
      
      setGeneratedCount(0);
      setMessage(`✅ Deleted ${snapshot.size} estimates!`);
      setLoading(false);
    } catch (error) {
      console.error("Error deleting test data:", error);
      setMessage(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🧪 Test Data Generator</h2>
        <p style={styles.subtitle}>
          Generate sample window/door estimates for testing your dashboard
        </p>

        {message && (
          <div style={{
            ...styles.message,
            background: message.includes("❌") ? "#fee" : message.includes("✅") ? "#efe" : "#fef3cd"
          }}>
            {message}
          </div>
        )}

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Quick Generate</h3>
          <div style={styles.buttonGroup}>
            <button
              onClick={() => generateTestData(5)}
              disabled={loading}
              style={styles.btnPrimary}
            >
              Generate 5 Estimates
            </button>
            <button
              onClick={() => generateTestData(10)}
              disabled={loading}
              style={styles.btnPrimary}
            >
              Generate 10 Estimates
            </button>
            <button
              onClick={() => generateTestData(20)}
              disabled={loading}
              style={styles.btnSecondary}
            >
              Generate 20 Estimates
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Generate by Status</h3>
          <div style={styles.buttonGroup}>
            <button
              onClick={() => generateByStatus("PENDING", 5)}
              disabled={loading}
              style={styles.btnWarning}
            >
              5 PENDING
            </button>
            <button
              onClick={() => generateByStatus("APPROVED", 3)}
              disabled={loading}
              style={styles.btnSuccess}
            >
              3 APPROVED
            </button>
            <button
              onClick={() => generateByStatus("DECLINED", 2)}
              disabled={loading}
              style={styles.btnDanger}
            >
              2 DECLINED
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Cleanup</h3>
          <button
            onClick={clearAllTestData}
            disabled={loading}
            style={styles.btnDanger}
          >
            🗑️ Delete All My Test Data
          </button>
        </div>

        <div style={styles.stats}>
          <strong>Total Generated This Session:</strong> {generatedCount}
          <br />
          <strong>Logged in as:</strong> {auth.currentUser?.email || "Not logged in"}
        </div>

        <div style={styles.info}>
          <strong>💡 What This Does:</strong>
          <ul style={{ marginTop: 10, textAlign: "left" }}>
            <li>Creates realistic window/door estimates in your Firestore</li>
            <li>Uses real Chicago suburbs addresses</li>
            <li>Generates random dates within last 3 months</li>
            <li>Includes various statuses (PENDING, APPROVED, DECLINED)</li>
            <li>All estimates will appear in your dashboard immediately</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "40px 20px",
    maxWidth: "800px",
    margin: "0 auto",
    fontFamily: "Inter, sans-serif",
  },
  card: {
    background: "white",
    borderRadius: "8px",
    padding: "30px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  title: {
    margin: "0 0 10px 0",
    color: "#333",
    fontSize: "28px",
  },
  subtitle: {
    margin: "0 0 30px 0",
    color: "#666",
    fontSize: "16px",
  },
  message: {
    padding: "12px 16px",
    borderRadius: "4px",
    marginBottom: "20px",
    border: "1px solid #ddd",
  },
  section: {
    marginBottom: "30px",
    paddingBottom: "20px",
    borderBottom: "1px solid #eee",
  },
  sectionTitle: {
    fontSize: "18px",
    marginBottom: "15px",
    color: "#333",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  btnPrimary: {
    padding: "10px 20px",
    background: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  btnSecondary: {
    padding: "10px 20px",
    background: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  btnSuccess: {
    padding: "10px 20px",
    background: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  btnWarning: {
    padding: "10px 20px",
    background: "#ffc107",
    color: "#000",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  btnDanger: {
    padding: "10px 20px",
    background: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  stats: {
    padding: "15px",
    background: "#f8f9fa",
    borderRadius: "4px",
    marginBottom: "20px",
    fontSize: "14px",
  },
  info: {
    padding: "15px",
    background: "#e7f3ff",
    borderRadius: "4px",
    fontSize: "14px",
    color: "#004085",
  },
};

export default TestDataGenerator;