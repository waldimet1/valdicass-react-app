// src/ViewQuote.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

const ViewQuote = () => {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("id");
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quoteId) {
      setError("Missing quote id in the URL.");
      setLoading(false);
      return;
    }

    const fetchAndMarkViewed = async () => {
      try {
        const ref = doc(db, "quotes", quoteId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("Quote not found.");
          setLoading(false);
          return;
        }

        const data = snap.data();
        setQuote({ id: snap.id, ...data });

        // Only mark as viewed if not already done
        if (data.viewed !== true) {
          setMarking(true);

          const nextStatus =
            data.status === "signed" || data.status === "declined"
              ? data.status // don't override terminal states
              : "viewed";

          await updateDoc(ref, {
            viewed: true,
            status: nextStatus,
            // nested update for timestamps
            "statusTimestamps.viewed":
              data?.statusTimestamps?.viewed || Timestamp.now(),
          });

          // Refresh local state to reflect the change without a second fetch
          setQuote((prev) =>
            prev
              ? {
                  ...prev,
                  viewed: true,
                  status: nextStatus,
                  statusTimestamps: {
                    ...(prev.statusTimestamps || {}),
                    viewed:
                      prev?.statusTimestamps?.viewed || Timestamp.now(),
                  },
                }
              : prev
          );
        }
      } catch (e) {
        console.error("Failed to load/mark quote as viewed:", e);
        setError("Failed to load quote.");
      } finally {
        setMarking(false);
        setLoading(false);
      }
    };

    fetchAndMarkViewed();
  }, [quoteId]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Loading quote…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "crimson", textAlign: "center" }}>
        {error}
      </div>
    );
  }

  if (!quote) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        No quote to display.
      </div>
    );
  }

  // --- Render a simple client-facing preview ---
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Quote Preview</h1>
        <div style={{ color: "#666" }}>
          Status: <strong>{quote.status || (quote.viewed ? "viewed" : "sent")}</strong>
          {marking && " • marking viewed…"}
        </div>
      </header>

      <section style={{ marginBottom: 16 }}>
        <h3>Client</h3>
        <div><strong>Name:</strong> {quote.client?.name || "—"}</div>
        <div><strong>Email:</strong> {quote.client?.clientEmail || "—"}</div>
        <div><strong>Address:</strong> {quote.client?.address || "—"}</div>
      </section>

      <section style={{ marginBottom: 16 }}>
        <h3>Totals</h3>
        <div><strong>Subtotal:</strong> ${Number(quote.subtotal || 0).toLocaleString()}</div>
        <div><strong>Tax:</strong> ${Number(quote.tax || 0).toLocaleString()}</div>
        <div style={{ fontWeight: 700 }}>
          <strong>Total:</strong> ${Number(quote.total || 0).toLocaleString()}
        </div>
      </section>

      <section>
        <h3>Rooms & Items</h3>
        {Array.isArray(quote.rooms) && quote.rooms.length > 0 ? (
          quote.rooms.map((room, idx) => (
            <div key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 600 }}>{room.name || `Room ${idx + 1}`}</div>
              {(room.items || []).map((item) => (
                <div
                  key={item.uid}
                  style={{
                    padding: "8px 12px",
                    marginTop: 8,
                    background: "#fafafa",
                    borderRadius: 8,
                    border: "1px solid #eee",
                  }}
                >
                  <div><strong>Type:</strong> {item.type}</div>
                  <div><strong>Style:</strong> {item.style}</div>
                  <div><strong>Material/Series:</strong> {item.material} / {item.series}</div>
                  <div>
                    <strong>Size:</strong> {item.width} x {item.height}
                    {item.quantity ? <> • <strong>Qty:</strong> {item.quantity}</> : null}
                  </div>
                  <div><strong>Unit Price:</strong> ${Number(item.unitPrice || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <div>No items.</div>
        )}
      </section>
    </div>
  );
};

export default ViewQuote;

