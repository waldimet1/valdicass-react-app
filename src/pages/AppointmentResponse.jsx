// src/pages/AppointmentResponse.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "./AppointmentResponse.css";

const AppointmentResponse = () => {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get("id");
  
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  
  const [rescheduleData, setRescheduleData] = useState({
    preferredDate: "",
    preferredTime: "",
    notes: "",
  });

  useEffect(() => {
    loadAppointment();
  }, [appointmentId]);

  const loadAppointment = async () => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }

    try {
      const docRef = doc(db, "appointments", appointmentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppointment({
          id: docSnap.id,
          ...data,
          date: data.date?.toDate?.() || new Date(data.date),
        });

        // Mark as opened
        if (!data.emailOpened) {
          await updateDoc(docRef, {
            emailOpened: true,
            openedAt: serverTimestamp(),
          });
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading appointment:", error);
      setLoading(false);
    }
  };

  const handleResponse = async (response) => {
    if (!appointment) return;
    
    setResponding(true);

    try {
      const docRef = doc(db, "appointments", appointment.id);
      
      const updates = {
        status: response,
        responseReceived: true,
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (response === "rescheduled" && rescheduleData.preferredDate) {
        updates.rescheduleRequest = {
          preferredDate: rescheduleData.preferredDate,
          preferredTime: rescheduleData.preferredTime,
          notes: rescheduleData.notes,
          requestedAt: new Date().toISOString(),
        };
      }

      await updateDoc(docRef, updates);

      // Send notification email to sales rep
      await fetch("/api/notify-appointment-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          response: response,
          rescheduleData: response === "rescheduled" ? rescheduleData : null,
          appointment: appointment, // Pass full appointment object
        }),
      });

      setSubmitted(true);
      setResponding(false);
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("Error submitting response. Please try again.");
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="appointment-response-page">
        <div className="appointment-response-container">
          <div className="appointment-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="appointment-response-page">
        <div className="appointment-response-container">
          <div className="appointment-error">
            <h2>Appointment Not Found</h2>
            <p>The appointment link may be invalid or expired.</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="appointment-response-page">
        <div className="appointment-response-container">
          <div className="appointment-success">
            <div className="success-icon">✓</div>
            <h2>Response Submitted!</h2>
            <p>
              {appointment.status === "confirmed" && "Your appointment has been confirmed. We'll see you then!"}
              {appointment.status === "declined" && "We've received your cancellation. Thank you for letting us know."}
              {appointment.status === "rescheduled" && "We've received your reschedule request. Someone will contact you shortly."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (appointment.responseReceived) {
    return (
      <div className="appointment-response-page">
        <div className="appointment-response-container">
          <div className="appointment-info">
            <h2>Response Already Submitted</h2>
            <p>You've already responded to this appointment invitation.</p>
            <p><strong>Status:</strong> {appointment.status}</p>
          </div>
        </div>
      </div>
    );
  }

  const getAppointmentTypeLabel = (type) => {
    const labels = {
      "site-visit": "Site Visit",
      "installation": "Installation",
      "call": "Call/Meeting",
    };
    return labels[type] || type;
  };

  return (
    <div className="appointment-response-page">
      <div className="appointment-response-container">
        <div className="appointment-header">
          <img src="/valdicass-logo.png" alt="Valdicass" className="appointment-logo" />
          <h1>Appointment Invitation</h1>
        </div>

        <div className="appointment-card">
          <div className="appointment-type-badge" style={{ background: "#007bff" }}>
            {getAppointmentTypeLabel(appointment.appointmentType)}
          </div>

          <h2>{appointment.title}</h2>

          <div className="appointment-details">
            <div className="appointment-detail-row">
              <span className="detail-icon">📅</span>
              <div>
                <strong>Date & Time</strong>
                <p>
                  {appointment.date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  <br />
                  {appointment.date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" "}({appointment.duration} minutes)
                </p>
              </div>
            </div>

            {appointment.address && (
              <div className="appointment-detail-row">
                <span className="detail-icon">📍</span>
                <div>
                  <strong>Location</strong>
                  <p>{appointment.address}</p>
                </div>
              </div>
            )}

            {appointment.notes && (
              <div className="appointment-detail-row">
                <span className="detail-icon">📝</span>
                <div>
                  <strong>Notes</strong>
                  <p>{appointment.notes}</p>
                </div>
              </div>
            )}

            <div className="appointment-detail-row">
              <span className="detail-icon">👤</span>
              <div>
                <strong>Scheduled by</strong>
                <p>{appointment.createdByName}</p>
              </div>
            </div>
          </div>

          {!showReschedule ? (
            <div className="appointment-actions">
              <button
                className="appointment-btn appointment-btn-confirm"
                onClick={() => handleResponse("confirmed")}
                disabled={responding}
              >
                ✓ Confirm Appointment
              </button>
              <button
                className="appointment-btn appointment-btn-reschedule"
                onClick={() => setShowReschedule(true)}
                disabled={responding}
              >
                📅 Request Reschedule
              </button>
              <button
                className="appointment-btn appointment-btn-decline"
                onClick={() => handleResponse("declined")}
                disabled={responding}
              >
                ✗ Decline
              </button>
            </div>
          ) : (
            <div className="reschedule-form">
              <h3>Request a Reschedule</h3>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Please provide your preferred date and time, and we'll reach out to confirm.
              </p>

              <div className="form-group">
                <label>Preferred Date *</label>
                <input
                  type="date"
                  value={rescheduleData.preferredDate}
                  onChange={(e) =>
                    setRescheduleData({ ...rescheduleData, preferredDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Preferred Time *</label>
                <input
                  type="time"
                  value={rescheduleData.preferredTime}
                  onChange={(e) =>
                    setRescheduleData({ ...rescheduleData, preferredTime: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  value={rescheduleData.notes}
                  onChange={(e) =>
                    setRescheduleData({ ...rescheduleData, notes: e.target.value })
                  }
                  placeholder="Any specific requirements or preferences..."
                  rows="3"
                />
              </div>

              <div className="reschedule-actions">
                <button
                  className="appointment-btn appointment-btn-secondary"
                  onClick={() => setShowReschedule(false)}
                  disabled={responding}
                >
                  Cancel
                </button>
                <button
                  className="appointment-btn appointment-btn-confirm"
                  onClick={() => handleResponse("rescheduled")}
                  disabled={responding || !rescheduleData.preferredDate || !rescheduleData.preferredTime}
                >
                  {responding ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentResponse;