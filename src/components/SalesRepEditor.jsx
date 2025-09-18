// src/components/SalesRepEditor.jsx
import React, { useState } from "react";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function SalesRepEditor({ value, onChange, title = "Sales Representative" }) {
  const [open, setOpen] = useState(true);
  const rep = value || { name: "", email: "", phone: "", uid: "" };

  async function useMyInfo() {
    const u = auth.currentUser;
    if (!u) return;
    let name = u.displayName || "";
    let phone = "";
    try {
      const prof = await getDoc(doc(db, "users", u.uid));
      if (prof.exists()) {
        const p = prof.data();
        phone = p.phone || p.phoneNumber || "";
        if (!name) name = p.name || p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ");
      }
    } catch {}
    onChange({
      ...rep,
      uid: u.uid,
      name: name || rep.name,
      email: u.email || rep.email,
      phone: phone || rep.phone,
    });
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.head}>
        <div style={styles.title}>{title}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={useMyInfo} style={styles.btnSubtle}>Use my info</button>
          <button type="button" onClick={() => setOpen(o => !o)} style={styles.btnSubtle}>
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open && (
        <div style={styles.grid}>
          <div>
            <label style={styles.label}>Name</label>
            <input
              value={rep.name || ""}
              onChange={(e) => onChange({ ...rep, name: e.target.value })}
              placeholder="Sales rep full name"
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={rep.email || ""}
              onChange={(e) => onChange({ ...rep, email: e.target.value })}
              placeholder="name@company.com"
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Phone</label>
            <input
              value={rep.phone || ""}
              onChange={(e) => onChange({ ...rep, phone: e.target.value })}
              placeholder="(555) 555-5555"
              style={styles.input}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap:   { border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fafafa", marginTop: 12 },
  head:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title:  { fontWeight: 800, color: "#0f172a" },
  grid:   { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  label:  { display: "block", fontSize: 12, color: "#667085", marginBottom: 6 },
  input:  { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #dbe2ea", outline: "none" },
  btnSubtle: { padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" },
};
