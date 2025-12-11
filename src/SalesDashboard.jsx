import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import { useNavigate, useLocation } from "react-router-dom";
import "./SalesDashboard.css";

const SalesDashboard = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const ADMIN_UID = "REuTGQ98bAM0riY9xidS8fW6obl2";

  // 🔐 Monitor auth state
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      console.log("🔐 Auth State:", currentUser?.email || "Not logged in");
      setUser(currentUser);
      setIsAdmin(currentUser?.uid === ADMIN_UID);
      if (!currentUser) {
        setLoading(false);
        setError("Please log in to view estimates");
      }
    });
    return () => unsubAuth();
  }, []);

  // 🔥 Load quotes - Admin sees all, Salesperson sees only their own
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    console.log("🔥 Setting up Firestore listener for user:", user.uid, "Admin:", isAdmin);
    setLoading(true);
    setError(null);

    try {
      // Admin sees all quotes, Salesperson sees only their own
      const q = isAdmin
        ? query(collection(db, "quotes"), orderBy("createdAt", "desc"))
        : query(
            collection(db, "quotes"),
            where("createdBy", "==", user.uid),
            orderBy("createdAt", "desc")
          );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          console.log("📊 Firestore snapshot received:", snapshot.size, "documents");
          
          const data = snapshot.docs.map((doc) => {
            const docData = doc.data();
            return {
              id: doc.id,
              ...docData,
            };
          });
          
          setQuotes(data);
          setLoading(false);
          
          const statusBreakdown = data.reduce((acc, q) => {
            const status = q.status || "NO_STATUS";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});
          console.log("📈 Status Breakdown:", statusBreakdown);
        },
        (err) => {
          console.error("❌ Firestore Error:", err);
          if (err.code === "failed-precondition") {
            setError("Database index needed. Check console for Firestore link.");
          } else if (err.code === "permission-denied") {
            setError("Permission denied. Check Firestore security rules.");
          } else {
            setError(`Error loading estimates: ${err.message}`);
          }
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("❌ Setup Error:", err);
      setError(`Setup error: ${err.message}`);
      setLoading(false);
    }
  }, [user, isAdmin]);

  // 🔔 Calculate notifications
  const notifications = useMemo(() => {
    const emailOpened = quotes.filter(q => q.emailOpened && !q.signed && !q.declined).length;
    const signed = quotes.filter(q => q.signed).length;
    const declined = quotes.filter(q => q.declined).length;
    const total = emailOpened + signed + declined;
    
    return { emailOpened, signed, declined, total };
  }, [quotes]);

  // 🔎 Filter by status + search
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      // Filter by status
      if (statusFilter === "PENDING" && q.status !== "PENDING" && q.status !== "draft" && q.status !== "sent") return false;
      if (statusFilter === "APPROVED" && !q.signed) return false;
      if (statusFilter === "DECLINED" && !q.declined) return false;
      if (statusFilter === "TEMPLATES" && !q.isTemplate) return false;

      // Filter by search term
      if (!searchTerm) return true;

      const term = searchTerm.toLowerCase();
      const client = (q.clientName || q.client?.name || "").toLowerCase();
      const address = (
        `${q.address || q.client?.address || ""} ${q.city || ""} ${q.zip || ""}`
      ).toLowerCase();
      const estimateNumber = (q.estimateNumber || "").toString().toLowerCase();
      const poNumber = (q.poNumber || "").toString().toLowerCase();

      return (
        client.includes(term) ||
        address.includes(term) ||
        estimateNumber.includes(term) ||
        poNumber.includes(term)
      );
    });
  }, [quotes, statusFilter, searchTerm]);

  // 📆 Group quotes by Month / Year
  const quotesByMonth = useMemo(() => {
    const groups = {};
    filteredQuotes.forEach((q) => {
      let date;
      if (q.createdAt?.toDate) {
        date = q.createdAt.toDate();
      } else if (q.createdAt) {
        date = new Date(q.createdAt);
      } else {
        date = new Date();
      }
      const key = date.toLocaleString("default", { month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    return groups;
  }, [filteredQuotes]);

  const formatCurrency = (num) => {
    if (num == null || isNaN(num)) return "$0.00";
    return Number(num).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  };

  const formatDate = (ts) => {
  let date;
  
  // Handle Firestore Timestamp
  if (ts && typeof ts.toDate === 'function') {
    date = ts.toDate();
  }
  // Handle ISO string or timestamp
  else if (ts) {
    date = new Date(ts);
  }
  // Fallback to current date
  else {
    date = new Date();
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

  const formatDateShort = (ts) => {
    let date;
    if (ts?.toDate) date = ts.toDate();
    else if (ts) date = new Date(ts);
    else date = new Date();

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getMonthlyTotal = (list) =>
    list.reduce((sum, q) => sum + (Number(q.total) || 0), 0);

  const getStatusBadge = (q) => {
    if (q.signed) return { text: "SIGNED", color: "#28a745" };
    if (q.declined) return { text: "DECLINED", color: "#dc3545" };
    if (q.status === "sent") return { text: "ISSUED", color: "#ffc107" };
    if (q.status === "draft") return { text: "DRAFT", color: "#6c757d" };
    return { text: "ISSUED", color: "#ffc107" };
  };

  const emailStatusText = (q) => {
    if (q.emailOpened) return { text: "Email opened", icon: "📧", color: "#28a745" };
    if (q.emailSent) return { text: "Email sent", icon: "✉️", color: "#666" };
    return null;
  };

  const handleView = (id) => {
    navigate(`/quote/${id}`);
  };

  const handleEdit = (estimateId) => {
  navigate(`/estimate/edit/${estimateId}`);
};

  const currentUserName = user?.displayName || user?.email || "User";

  const isActive = (path) => location.pathname === path;

  // 🎨 LOADING STATE
  if (loading) {
    return (
      <div className="estimates-dashboard">
        <div className="vd-header">
          <div className="vd-logo">
            <img src="/valdicass-logo.png" alt="Valdicass" style={{ height: 40 }} />
          </div>
        </div>
        <div className="vd-main" style={{ padding: "40px", textAlign: "center" }}>
          <h2>Loading estimates...</h2>
        </div>
      </div>
    );
  }

  // ❌ ERROR STATE
  if (error) {
    return (
      <div className="estimates-dashboard">
        <div className="vd-header">
          <div className="vd-logo">Valdicass</div>
        </div>
        <div className="vd-main" style={{ padding: "40px", textAlign: "center" }}>
          <h2 style={{ color: "#dc3545" }}>⚠️ Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // 📊 MAIN DASHBOARD
  return (
    <div className="estimates-dashboard">
      {/* HEADER */}
      <div className="vd-header">
        <div className="vd-logo">
          <img src="/valdicass-logo.png" alt="Valdicass" style={{ height: 40 }} />
        </div>

        <div className="vd-main-content">
          <h1 className="vd-page-title">Estimates</h1>
        </div>

        <div className="vd-header-right">
          {/* Notification Bell */}
          <div className="vd-notification-bell" onClick={() => navigate("/activity")}>
            🔔
            {notifications.total > 0 && (
              <span className="vd-notification-badge">{notifications.total}</span>
            )}
          </div>

          {/* User Menu */}
          <div className="vd-user-menu">
            <div className="vd-user-avatar">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div className="vd-user-info">
              <div className="vd-user-name">{currentUserName}</div>
              <div className="vd-user-role">{isAdmin ? "Admin" : "Salesperson"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="vd-sidebar">
        <ul>
          <li onClick={() => navigate("/dashboard")} className={isActive("/dashboard") ? "active" : ""}>
            <span className="vd-sidebar-icon">📊</span> Estimates
          </li>
          <li onClick={() => navigate("/schedule")} className={isActive("/schedule") ? "active" : ""}>
            <span className="vd-sidebar-icon">📅</span> Schedule
          </li>
          <li onClick={() => navigate("/invoices")} className={isActive("/invoices") ? "active" : ""}>
            <span className="vd-sidebar-icon">📄</span> Invoices
          </li>
          <li onClick={() => navigate("/clients")} className={isActive("/clients") ? "active" : ""}>
            <span className="vd-sidebar-icon">👥</span> Clients
          </li>
          <li onClick={() => navigate("/items")} className={isActive("/items") ? "active" : ""}>
            <span className="vd-sidebar-icon">📦</span> Items
          </li>
          <li onClick={() => navigate("/valdicass-pro")} className={isActive("/valdicass-pro") ? "active" : ""}>
            <span className="vd-sidebar-icon">⭐</span> VC Pro
          </li>
          <li onClick={() => navigate("/project-google-reviews")} className={isActive("/project-google-reviews") ? "active" : ""}>
            <span className="vd-sidebar-icon">⭐</span> Collect Google Reviews
          </li>
          <li onClick={() => navigate("/payments")} className={isActive("/payments") ? "active" : ""}>
            <span className="vd-sidebar-icon">💳</span> Payments
          </li>
          <li onClick={() => navigate("/reports")} className={isActive("/reports") ? "active" : ""}>
            <span className="vd-sidebar-icon">📈</span> Reports
          </li>
          <li onClick={() => navigate("/settings")} className={isActive("/settings") ? "active" : ""}>
            <span className="vd-sidebar-icon">⚙️</span> Settings
          </li>
        </ul>
      </div>

      {/* MAIN CONTENT */}
      <div className="vd-main">
        {/* SEARCH & ACTIONS - UPDATED TO SINGLE ROW */}
        <div className="dashboard-actions-bar">
          {/* Search on the left */}
          <div className="dashboard-search">
            <input
              type="text"
              placeholder="Search all estimates by Name, Address, Estimate # or PO #"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Buttons on the right */}
          <div className="dashboard-action-buttons">
            <button className="btn-export">Export</button>
            <button className="btn-template" onClick={() => navigate('/templates')}>
  Use Template <span className="pro-badge">PRO</span>
</button>
            <button
              className="btn-new-estimate"
              onClick={() => navigate("/estimate/new")}
            >
              New Estimate
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="vd-tabs">
          <div
            className={`vd-tab ${statusFilter === "PENDING" ? "active" : ""}`}
            onClick={() => setStatusFilter("PENDING")}
          >
            PENDING
          </div>
          <div
            className={`vd-tab ${statusFilter === "APPROVED" ? "active" : ""}`}
            onClick={() => setStatusFilter("APPROVED")}
          >
            APPROVED
          </div>
          <div
            className={`vd-tab ${statusFilter === "DECLINED" ? "active" : ""}`}
            onClick={() => setStatusFilter("DECLINED")}
          >
            DECLINED
          </div>
        </div>

        {/* ESTIMATES LIST */}
        {Object.entries(quotesByMonth).map(([monthLabel, monthQuotes]) => (
          <div className="vd-month-section" key={monthLabel}>
            <div className="vd-month-header">
              <h2>{monthLabel}</h2>
              <div className="vd-month-total">Total: {formatCurrency(getMonthlyTotal(monthQuotes))}</div>
            </div>

            {monthQuotes.map((q) => {
              const statusBadge = getStatusBadge(q);
              const emailStatus = emailStatusText(q);
              const clientName = q.clientName || q.client?.name || "Unknown Client";
              const address = q.address || q.client?.address || "";
              const city = q.city || q.client?.city || "";
              const zip = q.zip || q.client?.zip || "";
              const phone = q.phone || q.client?.phone || "";

              return (
                <div className="vd-estimate-card" key={q.id}>
                  <div className="vd-estimate-header">
                    <div className="vd-estimate-title">
                      <strong>{clientName}</strong> - #{q.estimateNumber || q.id.slice(0, 6)}
                    </div>
                    <div className="vd-estimate-amount">{formatCurrency(q.total)}</div>
                  </div>

                  <div className="vd-estimate-body">
                    <div className="vd-estimate-left">
                      <div className="vd-estimate-date">{formatDateShort(q.createdAt)}</div>
                      <div
                        className="vd-estimate-status"
                        style={{ background: statusBadge.color }}
                      >
                        {statusBadge.text}
                      </div>
                    </div>

                    <div className="vd-estimate-center">
                      <div className="vd-estimate-address">
                        {address}
                        {(city || zip) && (
                          <>
                            <br />
                            {city && zip ? `${city}, ${zip}` : city || zip}
                          </>
                        )}
                      </div>
                      {phone && <div className="vd-estimate-phone">{phone}</div>}
                    </div>

                    <div className="vd-estimate-right">
                      {emailStatus && (
                        <div
                          className="vd-estimate-email"
                          style={{ color: emailStatus.color }}
                        >
                          {emailStatus.icon} {emailStatus.text}
                        </div>
                      )}
                      <div className="vd-estimate-actions">
                        <button className="vd-btn-outline" onClick={() => handleView(q.id)}>
                          Open
                        </button>
                        <button className="vd-btn-secondary" onClick={() => handleEdit(q.id)}>
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {filteredQuotes.length === 0 && (
          <div className="vd-empty-state">
            <h3>No {statusFilter.toLowerCase()} estimates found</h3>
            <p>Try selecting a different tab or create your first estimate.</p>
            <button
              className="vd-btn vd-btn-primary"
              onClick={() => navigate("/estimate/new")}
            >
              Create Your First Estimate
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesDashboard;