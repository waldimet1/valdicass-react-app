// src/EstimateForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/services/firebaseConfig";

import LineItem from "./LineItem";
import valdicassLogo from "./assets/valdicass-logo.png";
import greenskyLogo from "./assets/greensky-logo.jpeg";
import "./EstimateForm.css";
import usePricing from "./hooks/usePricing";
import { PDFDownloadLink } from '@react-pdf/renderer';
import QuotePdf from './pdf/QuotePdf';
import SaveQuotePdfButton from "./components/SaveQuotePdfButton";
import DownloadQuotePdfButton from "./components/DownloadQuotePdfButton";
<PDFDownloadLink
  document={<QuotePdf quote={quoteDoc} />}
  fileName={`Valdicass_Quote_${quoteId}.pdf`}
>
  {({ loading }) => (
    <button disabled={loading}>
      {loading ? 'Building PDF…' : 'Download PDF'}
    </button>
  )}
</PDFDownloadLink>
// Helpers inlined to avoid path issues during build
function makeQuoteDisplayName({ clientName, city, createdAt, total }) {
  const who = (clientName || "Customer").trim();
  const when =
    createdAt instanceof Date
      ? createdAt
      : createdAt?.toDate?.() instanceof Date
      ? createdAt.toDate()
      : new Date();
  const whenStr = when.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  const loc = city ? ` • ${city}` : "";
  const money =
    typeof total === "number" && Number.isFinite(total)
      ? ` — $${Number(total).toLocaleString()}`
      : "";
  return `${who}${loc} — ${whenStr}${money}`;
}

function creatorFromUser(user) {
  return {
    createdBy: user?.uid || null,
    createdByName: user?.displayName || user?.email || "Unknown",
    createdByEmail: user?.email || null,
  };
}

const EstimateForm = () => {
  const [client, setClient] = useState({ name: "", address: "", clientEmail: "" });
  const [rooms, setRooms] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  const [isCheckout, setIsCheckout] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [sending, setSending] = useState(false);

  const { pricingMap: pricing } = usePricing();
  const navigate = useNavigate();
  const itemRefsMap = useRef({}); // refs per room

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    // Scroll to last added item for each room
    rooms.forEach((room, roomIndex) => {
      const itemRefs = itemRefsMap.current[roomIndex];
      if (itemRefs && itemRefs.length > 0) {
        const lastRef = itemRefs[itemRefs.length - 1];
        lastRef?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [rooms]);

  const getPrice = (pricingMap, item) => {
    const styleData = pricingMap?.[item.material]?.[item.series]?.[item.style];
    if (typeof styleData === "number") return styleData;
    if (styleData?.Standard) return styleData.Standard;
    return 0;
  };

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const addRoom = () => setRooms([...rooms, { name: "", items: [] }]);

  const updateRoomName = (index, name) => {
    const updated = [...rooms];
    updated[index].name = name;
    setRooms(updated);
  };

  const removeRoom = (index) => {
    const updated = [...rooms];
    updated.splice(index, 1);
    setRooms(updated);
  };

  const addLineItemToRoom = (roomIndex) => {
    if (!pricing || Object.keys(pricing).length === 0) {
      alert("⚠️ Pricing not loaded yet.");
      return;
    }

    const defaultMaterial = Object.keys(pricing)[0];
    const defaultSeries = Object.keys(pricing[defaultMaterial])[0];
    const defaultStyle = Object.keys(pricing[defaultMaterial][defaultSeries])[0];

    const basePrice = getPrice(pricing, {
      material: defaultMaterial,
      series: defaultSeries,
      style: defaultStyle,
    });

    const newItem = {
      uid: (typeof crypto !== "undefined" && crypto.randomUUID?.()) || Date.now().toString(),
      location: "",
      width: "",
      height: "",
      type: "Window",
      style: defaultStyle,
      venting: "",
      material: defaultMaterial,
      series: defaultSeries,
      colorExt: "",
      colorInt: "",
      installMethod: "",
      quantity: 1,
      unitPrice: basePrice,
      notes: "",
    };

    const updated = [...rooms];
    updated[roomIndex].items.push(newItem);
    setRooms(updated);
  };

  const updateLineItem = (roomIndex, itemIndex, updatedItem) => {
    updatedItem.unitPrice = getPrice(pricing, updatedItem);
    const updated = [...rooms];
    updated[roomIndex].items[itemIndex] = updatedItem;
    setRooms(updated);
  };

  const removeLineItem = (roomIndex, itemIndex) => {
    const updated = [...rooms];
    updated[roomIndex].items.splice(itemIndex, 1);
    setRooms(updated);
  };

  const handleDragEnd = (result, roomIndex) => {
    if (!result.destination) return;
    const updated = [...rooms];
    const items = [...updated[roomIndex].items];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    updated[roomIndex].items = items;
    setRooms(updated);
  };

  const calculateTotal = () => {
    let newSubtotal = 0;
    rooms.forEach((room) => {
      room.items.forEach((item) => {
        const quantity = parseInt(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        newSubtotal += quantity * unitPrice;
      });
    });
    const newTax = newSubtotal * 0.08;
    setSubtotal(newSubtotal);
    setTax(newTax);
    setTotal(newSubtotal + newTax);
  };

  useEffect(() => {
    calculateTotal();
  }, [rooms]);

  // Save the quote and generate a share link
  const saveQuoteToFirestore = async () => {
    setIsCheckout(true);

    if (!auth?.currentUser) {
      alert("You must be logged in.");
      setIsCheckout(false);
      return;
    }
    if (!client.name || !client.address || !client.clientEmail) {
      alert("❌ Please fill out all client info.");
      setIsCheckout(false);
      return;
    }

    try {
      const user = auth.currentUser;
      const creator = creatorFromUser(user);
      const now = serverTimestamp();

      const displayName = makeQuoteDisplayName({
        clientName: client.name,
        city: undefined, // optional
        total: Number(total || 0),
      });

      const quote = {
        // 🏷️ Friendly label
        displayName,

        // 🧑‍💼 Ownership (new + legacy for back-compat)
        ...creator, // createdBy, createdByName, createdByEmail
        userId: user.uid,
        userEmail: user.email,

        // 📦 Payload
        client: {
          name: client.name,
          address: client.address,
          clientEmail: client.clientEmail,
        },
        rooms: Array.isArray(rooms) ? rooms : [],
        subtotal: Number(subtotal || 0),
        tax: Number(tax || 0),
        total: Number(total || 0),

        // ⏱️ Timestamps & status
        createdAt: now,
        date: now,
        status: "draft", // flips to "sent" when email is sent
        viewed: false,
        signed: false,
        declined: false,
        statusTimestamps: {
          sent: null,
          viewed: null,
          signed: null,
          declined: null,
        },
      };

      const docRef = await addDoc(collection(db, "quotes"), quote);

      // Build client link (prod or local)
      const base = window.location.origin.includes("localhost")
        ? "http://localhost:3000"
        : "https://app.valdicass.com";
      const url = `${base}/view-quote?id=${docRef.id}`;

      setShareUrl(url);
      setShowShare(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("🔥 Save error:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsCheckout(false);
    }
  };

  // pull “id=XXXX” out of https://app.valdicass.com/view-quote?id=XXXX
  const extractQuoteId = (url) => {
    try {
      const u = new URL(url);
      return u.searchParams.get("id") || "";
    } catch {
      return "";
    }
  };

  // Send email to client using your API, then mark status=sent
  const sendQuoteEmail = async () => {
    const quoteId = extractQuoteId(shareUrl);
    const payload = {
      quoteId,
      clientEmail: (client.clientEmail || "").trim(),
      clientName: (client.name || "").trim(),
      total: Number(total),
      shareUrl,
      createdBy: auth?.currentUser?.uid || "WEB",
    };

    const missing = [];
    if (!payload.quoteId) missing.push("quoteId");
    if (!payload.clientEmail) missing.push("clientEmail");
    if (!payload.clientName) missing.push("clientName");
    if (!Number.isFinite(payload.total)) missing.push("total");
    if (!payload.shareUrl) missing.push("shareUrl");
    if (missing.length) {
      console.error("send-quote missing:", missing, payload);
      alert(`Missing fields: ${missing.join(", ")}`);
      return;
    }

    try {
      setSending(true);
      const res = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        console.error("send-quote failed", res.status, json);
        throw new Error(json?.error || `Failed with ${res.status}`);
      }
      alert("✅ Email sent to client!");

      // mark Firestore as sent
      try {
        await updateDoc(doc(db, "quotes", quoteId), {
          status: "sent",
          statusTimestamps: {
            sent: serverTimestamp(),
            viewed: null,
            signed: null,
            declined: null,
          },
          emailLastMessageId: json.messageId || null,
        });
      } catch (e) {
        console.warn("Could not update Firestore status:", e);
      }
    } catch (e) {
      console.error("send-quote error:", e);
      alert("❌ Could not send email. Check server logs.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="px-4 py-6 bg-gray-100">
      <div className="estimate-container max-w-5xl mx-auto bg-white p-6 rounded shadow-md">
        <img src={valdicassLogo} alt="Valdicass Logo" className="valdicass-header-logo" />

        {showShare && (
          <div
            style={{
              background: "#f0f7ff",
              border: "1px solid #cfe3ff",
              padding: "12px",
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ Quote saved</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                id="share-link"
                value={shareUrl}
                readOnly
                style={{ flex: 1, minWidth: 240, padding: 8, borderRadius: 6, border: "1px solid #bcd2ff" }}
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Link copied!");
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Copy Link
              </button>
              <a
                href={shareUrl}
                className="bg-gray-700 text-white px-4 py-2 rounded"
                target="_blank"
                rel="noreferrer"
              >
                View Client Preview
              </a>
              <button
                onClick={sendQuoteEmail}
                disabled={sending}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                {sending ? "Sending…" : "Send to Client"}
              </button>
              <button onClick={() => navigate("/dashboard")} className="bg-black text-white px-4 py-2 rounded">
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        <h1 className="form-title mb-4">Estimate Form</h1>

        {/* Client Info */}
        <input name="name" value={client.name} onChange={handleClientChange} placeholder="Client Name" />
        <input name="address" value={client.address} onChange={handleClientChange} placeholder="Job Address" />
        <input
          name="clientEmail"
          value={client.clientEmail}
          onChange={handleClientChange}
          placeholder="Client Email"
          type="email"
        />

        {/* Rooms */}
        {rooms.map((room, roomIndex) => {
          const itemRefs = (itemRefsMap.current[roomIndex] = []);

          return (
            <div key={roomIndex} className="mt-6 p-4 bg-gray-50 rounded border">
              <input
                placeholder="Room Name (e.g., Kitchen)"
                value={room.name}
                onChange={(e) => updateRoomName(roomIndex, e.target.value)}
                className="mb-2"
              />
              <div className="text-sm text-gray-400 mb-2">↕️ Drag to reorder</div>

              <DragDropContext onDragEnd={(result) => handleDragEnd(result, roomIndex)}>
                <Droppable droppableId={`room-${roomIndex}`}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {room.items.map((item, itemIndex) => (
                        <Draggable key={item.uid} draggableId={item.uid} index={itemIndex}>
                          {(provided) => (
                            <div
                              ref={(el) => {
                                if (!itemRefsMap.current[roomIndex]) {
                                  itemRefsMap.current[roomIndex] = [];
                                }
                                itemRefsMap.current[roomIndex][itemIndex] = el;
                                provided.innerRef(el);
                              }}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <LineItem
                                item={item}
                                index={itemIndex}
                                pricing={pricing}
                                updateLineItem={(index, updatedItem) =>
                                  updateLineItem(roomIndex, index, updatedItem)
                                }
                                removeLineItem={() => removeLineItem(roomIndex, itemIndex)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext> {/* ✅ MISSING CLOSE TAG ADDED */}

              <div className="flex justify-between mt-4">
                <button onClick={() => addLineItemToRoom(roomIndex)} className="bg-blue-600 text-white px-4 py-2 rounded">
                  + Add Item to {room.name || "Room"}
                </button>
                <button onClick={() => removeRoom(roomIndex)} className="text-red-500">
                  🗑️ Remove Room
                </button>
              </div>
            </div>
          );
        })}

        <button onClick={addRoom} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded">
          + Add Room
        </button>

        {/* Totals */}
        <div className="mt-6">
          <p>Subtotal: ${subtotal.toFixed(2)}</p>
          <p>Tax (8%): ${tax.toFixed(2)}</p>
          <p className="font-bold">Total: ${total.toFixed(2)}</p>
        </div>

        <button onClick={saveQuoteToFirestore} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
          💾 Save Quote to Cloud
        </button>

        <img src={greenskyLogo} alt="GreenSky Financing" className="greensky-footer-logo mt-6" />
      </div>
    </div>
  );
};

export default EstimateForm;

























