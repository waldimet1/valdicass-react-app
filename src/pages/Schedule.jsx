// src/pages/Schedule.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import "./Schedule.css";

const Schedule = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    clientName: "",
    clientEmail: "",
    phone: "",
    address: "",
    appointmentType: "site-visit",
    startTime: "09:00",
    duration: 60,
    notes: "",
  });

  // Monitor auth state
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubAuth();
  }, []);

  // Load appointments from Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "appointments"),
      where("createdBy", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date(doc.data().date),
      }));
      setAppointments(data);
    });

    return () => unsub();
  }, [user]);

  const getMonthName = (date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const getAppointmentsForDay = (day) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.date);
      return (
        aptDate.getDate() === day &&
        aptDate.getMonth() === currentDate.getMonth() &&
        aptDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getAppointmentTypeColor = (type) => {
    switch (type) {
      case "site-visit":
        return "#007bff";
      case "installation":
        return "#00a651";
      case "call":
        return "#ffc107";
      default:
        return "#6c757d";
    }
  };

  const handleDayClick = (day) => {
    const clickedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    setSelectedDate(clickedDate);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const createAppointment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to create appointments");
      return;
    }

    if (!formData.clientName || !formData.clientEmail) {
      alert("Client name and email are required");
      return;
    }

    setLoading(true);

    try {
      // Create date object with selected date and time
      const [hours, minutes] = formData.startTime.split(":");
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Create appointment in Firestore
      const appointmentData = {
        title: formData.title || `${formData.appointmentType} - ${formData.clientName}`,
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        phone: formData.phone,
        address: formData.address,
        appointmentType: formData.appointmentType,
        date: appointmentDate,
        duration: parseInt(formData.duration),
        notes: formData.notes,
        
        // Tracking fields
        status: "pending", // pending, confirmed, declined, rescheduled
        emailSent: false,
        emailOpened: false,
        responseReceived: false,
        
        // Metadata
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "appointments"), appointmentData);

      // Generate response URL
      const base = window.location.origin.includes("localhost")
        ? "http://localhost:3000"
        : "https://app.valdicass.com";
      const responseUrl = `${base}/appointment-response?id=${docRef.id}`;

      // Send email invite via API
      await sendAppointmentEmail({
        appointmentId: docRef.id,
        clientEmail: formData.clientEmail,
        clientName: formData.clientName,
        appointmentDate: appointmentDate,
        appointmentType: formData.appointmentType,
        address: formData.address,
        notes: formData.notes,
        responseUrl: responseUrl,
        salesRepName: user.displayName || user.email,
      });

      // Update appointment with email sent status
      await updateDoc(doc(db, "appointments", docRef.id), {
        emailSent: true,
        responseUrl: responseUrl,
      });

      alert("✅ Appointment created and invitation sent!");
      
      // Reset form
      setFormData({
        title: "",
        clientName: "",
        clientEmail: "",
        phone: "",
        address: "",
        appointmentType: "site-visit",
        startTime: "09:00",
        duration: 60,
        notes: "",
      });
      setShowModal(false);
      setLoading(false);
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  const sendAppointmentEmail = async (data) => {
  const payload = {
    appointmentId: data.appointmentId,
    clientEmail: data.clientEmail,
    clientName: data.clientName,
    appointmentDate: data.appointmentDate.toISOString(),
    appointmentType: data.appointmentType,
    address: data.address,
    notes: data.notes,
    responseUrl: data.responseUrl,
    salesRepName: data.salesRepName,
  };

  try {
    const res = await fetch("/api/send-appointment-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    
    console.log('API Response:', { status: res.status, ok: res.ok, json });
    
    if (!res.ok) {
      throw new Error(json?.error || `API returned ${res.status}`);
    }

    if (!json.ok) {
      throw new Error(json.error || 'Email sending failed');
    }

    return json;
  } catch (error) {
    console.error('sendAppointmentEmail error:', error);
    throw error;
  }
};

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const headers = dayNames.map((day) => (
      <div key={day} className="schedule-day-header">
        {day}
      </div>
    ));

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="schedule-day-cell empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayAppointments = getAppointmentsForDay(day);
      const isToday =
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      days.push(
        <div
          key={day}
          className={`schedule-day-cell ${isToday ? "today" : ""}`}
          onClick={() => handleDayClick(day)}
        >
          <div className="schedule-day-number">{day}</div>
          <div className="schedule-day-appointments">
            {dayAppointments.slice(0, 3).map((apt) => (
              <div
                key={apt.id}
                className="schedule-appointment-mini"
                style={{ borderLeftColor: getAppointmentTypeColor(apt.appointmentType) }}
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`Appointment: ${apt.title}\nStatus: ${apt.status}`);
                }}
              >
                {apt.title}
              </div>
            ))}
            {dayAppointments.length > 3 && (
              <div className="schedule-more">+{dayAppointments.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="schedule-month-view">
        <div className="schedule-grid">
          {headers}
          {days}
        </div>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: "Pending", color: "#ffc107" },
      confirmed: { text: "Confirmed", color: "#00a651" },
      declined: { text: "Declined", color: "#dc3545" },
      rescheduled: { text: "Rescheduled", color: "#007bff" },
    };
    return badges[status] || badges.pending;
  };

  return (
    <div className="schedule-page">
      <div className="schedule-header">
     
        <h1>Schedule</h1>
      </div>

      <div className="schedule-container">
        <div className="schedule-controls">
          <div className="schedule-nav">
            <button className="schedule-btn" onClick={goToToday}>
              Today
            </button>
            <button className="schedule-btn-icon" onClick={() => navigateMonth(-1)}>
              ←
            </button>
            <button className="schedule-btn-icon" onClick={() => navigateMonth(1)}>
              →
            </button>
            <h2 className="schedule-month-title">{getMonthName(currentDate)}</h2>
          </div>

          <div className="schedule-view-switcher">
            <button
              className={`schedule-view-btn ${view === "month" ? "active" : ""}`}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              className={`schedule-view-btn ${view === "week" ? "active" : ""}`}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={`schedule-view-btn ${view === "day" ? "active" : ""}`}
              onClick={() => setView("day")}
            >
              Day
            </button>
          </div>

          <button className="schedule-btn-primary" onClick={() => {
            setSelectedDate(new Date());
            setShowModal(true);
          }}>
            + New Appointment
          </button>
        </div>

        <div className="schedule-legend">
          <div className="schedule-legend-item">
            <span className="schedule-legend-color" style={{ background: "#007bff" }}></span>
            Site Visit
          </div>
          <div className="schedule-legend-item">
            <span className="schedule-legend-color" style={{ background: "#00a651" }}></span>
            Installation
          </div>
          <div className="schedule-legend-item">
            <span className="schedule-legend-color" style={{ background: "#ffc107" }}></span>
            Call/Meeting
          </div>
        </div>

        {view === "month" && renderMonthView()}
        {view === "week" && (
          <div className="schedule-placeholder">
            <h3>📅 Week View</h3>
            <p>Coming soon! This will show a detailed week calendar.</p>
          </div>
        )}
        {view === "day" && (
          <div className="schedule-placeholder">
            <h3>📋 Day View</h3>
            <p>Coming soon! This will show hourly schedule for a single day.</p>
          </div>
        )}

        <div className="schedule-upcoming">
          <h3>Upcoming Appointments</h3>
          {appointments.length === 0 ? (
            <p style={{ color: "#666", textAlign: "center", padding: "40px" }}>
              No appointments scheduled. Click a date or "New Appointment" to create one.
            </p>
          ) : (
            appointments
              .sort((a, b) => a.date - b.date)
              .slice(0, 10)
              .map((apt) => {
                const statusBadge = getStatusBadge(apt.status);
                return (
                  <div key={apt.id} className="schedule-appointment-card">
                    <div
                      className="schedule-appointment-indicator"
                      style={{ background: getAppointmentTypeColor(apt.appointmentType) }}
                    ></div>
                    <div className="schedule-appointment-content">
                      <div className="schedule-appointment-header">
                        <strong>{apt.title}</strong>
                        <span className="schedule-appointment-time">
                          {apt.date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          at{" "}
                          {apt.date.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "8px" }}>
                        <span
                          className="schedule-status-badge"
                          style={{ background: statusBadge.color }}
                        >
                          {statusBadge.text}
                        </span>
                        {apt.emailSent && <span style={{ fontSize: "12px", color: "#666" }}>📧 Invite sent</span>}
                        {apt.emailOpened && <span style={{ fontSize: "12px", color: "#00a651" }}>✓ Opened</span>}
                        {apt.responseReceived && <span style={{ fontSize: "12px", color: "#00a651" }}>✓ Responded</span>}
                      </div>
                      {apt.address && (
                        <div className="schedule-appointment-address">📍 {apt.address}</div>
                      )}
                      {apt.notes && (
                        <div className="schedule-appointment-notes">{apt.notes}</div>
                      )}
                    </div>
                    <div className="schedule-appointment-actions">
                      <button className="schedule-btn-sm">Edit</button>
                      <button className="schedule-btn-sm">Cancel</button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Appointment Modal */}
      {showModal && (
        <div className="schedule-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h2>Create Appointment</h2>
              <button className="schedule-modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={createAppointment} className="schedule-modal-form">
              <div className="schedule-form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={selectedDate?.toISOString().split("T")[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  required
                />
              </div>

              <div className="schedule-form-row">
                <div className="schedule-form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="schedule-form-group">
                  <label>Duration (minutes) *</label>
                  <select name="duration" value={formData.duration} onChange={handleFormChange}>
                    <option value="30">30 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="180">3 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
              </div>

              <div className="schedule-form-group">
                <label>Appointment Type *</label>
                <select
                  name="appointmentType"
                  value={formData.appointmentType}
                  onChange={handleFormChange}
                  required
                >
                  <option value="site-visit">Site Visit</option>
                  <option value="installation">Installation</option>
                  <option value="call">Call/Meeting</option>
                </select>
              </div>

              <div className="schedule-form-group">
                <label>Client Name *</label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleFormChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="schedule-form-group">
                <label>Client Email *</label>
                <input
                  type="email"
                  name="clientEmail"
                  value={formData.clientEmail}
                  onChange={handleFormChange}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="schedule-form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="schedule-form-group">
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div className="schedule-form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  placeholder="Additional details about the appointment..."
                  rows="3"
                />
              </div>

              <div className="schedule-modal-footer">
                <button
                  type="button"
                  className="schedule-btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="schedule-btn-primary"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create & Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;