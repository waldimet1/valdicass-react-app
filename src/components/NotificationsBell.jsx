// src/components/NotificationBell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Bell } from "lucide-react"; // npm i lucide-react

const popover = {
  position: "absolute",
  top: "110%",
  right: 0,
  width: 360,
  maxHeight: 420,
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  padding: 12,
  zIndex: 1000,
};

const item = (unread) => ({
  padding: "10px 12px",
  borderRadius: 10,
  marginBottom: 8,
  background: unread ? "#f1f5f9" : "#ffffff",
  border: "1px solid #e5e7eb",
  cursor: "pointer",
});

const whenStyle = { fontSize: 12, color: "#6b7280", marginTop: 4 };

function fmt(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid),
      orderBy("openedAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setNotifs((prev) => {
        if (prev.length && list.length > prev.length && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        return list;
      });
    });
    return unsub;
  }, [user?.uid]);

  const unreadCount = useMemo(
    () => notifs.filter((n) => !n.isRead).length,
    [notifs]
  );

  async function markOneRead(id) {
    try {
      await updateDoc(doc(db, "notifications", id), { isRead: true });
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllRead() {
    try {
      const batch = writeBatch(db);
      notifs.filter((n) => !n.isRead).forEach((n) => {
        batch.update(doc(db, "notifications", n.id), { isRead: true });
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 999,
          border: "1px solid #e5e7eb",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 20,
              height: 20,
              padding: "0 6px",
              borderRadius: 999,
              background: "#ef4444",
              color: "#fff",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              border: "2px solid #fff",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={popover}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            <div style={{ flex: 1 }} />
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifs.length === 0 && (
            <div style={{ padding: 12, color: "#6b7280" }}>No notifications yet.</div>
          )}

          {notifs.map((n) => (
            <div
              key={n.id}
              style={item(!n.isRead)}
              onClick={() => markOneRead(n.id)}
              title="Mark as read"
            >
              <div style={{ fontSize: 14 }}>
                <b>{n.clientName || "Client"}</b> opened quote <b>{n.quoteId}</b>
              </div>
              {n.clientEmail && <div style={{ fontSize: 13 }}>{n.clientEmail}</div>}
              <div style={whenStyle}>{fmt(n.openedAt)}</div>
            </div>
          ))}
        </div>
      )}

      <audio ref={audioRef} preload="auto">
        {/* replace with your own tiny mp3 if desired */}
      </audio>
    </div>
  );
}


