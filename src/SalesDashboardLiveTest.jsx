import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const SalesDashboardLiveTest = ({ user, setUser }) => {
  const [quotes, setQuotes] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuotes = async () => {
      const q = query(
        collection(db, "quotes"),
        where("createdBy", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const fetchedQuotes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuotes(fetchedQuotes);
    };
    fetchQuotes();
  }, [user]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      navigate("/");
    });
  };

  const filters = ["All", "Sent", "Viewed", "Signed", "Declined"];

  const filteredQuotes = quotes.filter((quote) => {
    if (activeFilter === "All") return true;
    return quote.status?.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
       <img src="/valdicass-logo.png" alt="Valdicass Logo" style={{ height: 40 }} />

        <h2>Valdicass Quoting</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>

      <div style={styles.filterBar}>
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`filter-pill ${activeFilter === filter ? "active" : ""}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div>
        {filteredQuotes.map((quote) => (
          <div key={quote.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <h3>{quote.clientName || "Unnamed Client"}</h3>
              <span className={`status-tag ${quote.status?.toLowerCase() || ""}`}>
                {quote.status?.toUpperCase() || "UNKNOWN"}
              </span>
            </div>
            <p style={{ margin: "4px 0" }}>
              <strong>Location:</strong> {quote.location || "No location"}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Total:</strong> ${quote.total || 0}
            </p>
            <div style={styles.actions}>
              <button className="btn view" onClick={() => navigate(`/view-quote?id=${quote.id}`)}>View</button>
              <button className="btn resend">Resend</button>
              <button className="btn edit" onClick={() => navigate(`/edit?id=${quote.id}`)}>✏️ Edit</button>
              <button className="btn delete">Delete</button>
              <button className="btn download">Download</button>
            </div>
          </div>
        ))}
      </div>

      {/* CSS injection */}
      <style>{`
        .filter-pill {
          background: white;
          color: #004a99;
          border: 1px solid #004a99;
          padding: 6px 14px;
          font-size: 14px;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 4px;
        }
        .filter-pill:hover {
          background: #004a99;
          color: white;
        }
        .filter-pill.active {
          background: #004a99;
          color: white;
          font-weight: bold;
        }
        .status-tag {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 8px;
          text-transform: uppercase;
        }
        .status-tag.sent {
          background-color: #d0e7ff;
          color: #004a99;
        }
        .status-tag.viewed {
          background-color: #fff3cd;
          color: #856404;
        }
        .status-tag.signed {
          background-color: #d4edda;
          color: #155724;
        }
        .status-tag.declined {
          background-color: #f8d7da;
          color: #721c24;
        }
        .btn {
          margin: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          border: none;
          font-weight: 500;
          cursor: pointer;
        }
        .btn.view { background: #004a99; color: white; }
        .btn.resend { background: gray; color: white; }
        .btn.edit { background: #ffcc00; color: black; }
        .btn.delete { background: #dc3545; color: white; }
        .btn.download { background: #333; color: white; }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    padding: "1rem",
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    backgroundColor: "#004a99",
    color: "white",
    padding: "1rem",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  logoutBtn: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "8px 14px",
    cursor: "pointer",
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    padding: "1.5rem",
    margin: "1rem 0",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  actions: {
    marginTop: "1rem",
    display: "flex",
    flexWrap: "wrap",
  },
};

export default SalesDashboardLiveTest;



