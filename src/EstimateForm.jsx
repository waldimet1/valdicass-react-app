// src/EstimateForm.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { signInAnonymously } from "firebase/auth";
import UploadReadyQuote from "./components/UploadReadyQuote";
import LineItem from "./LineItem";
import valdicassLogo from "./assets/valdicass-logo.png";
import greenskyLogo from "./assets/greensky-logo.jpeg";
import "./EstimateForm.css";
import usePricing from "./hooks/usePricing";
import SaveQuotePdfButton from "./components/SaveQuotePdfButton";

/* ----------------------- helpers ---------------------- */
function creatorFromUser(user) {
  return {
    createdBy: user?.uid || null,
    createdByName: user?.displayName || user?.email || "Unknown",
    createdByEmail: user?.email || null,
  };
}

async function getDefaultPreparedBy() {
  const u = auth.currentUser;
  if (!u) return { uid: "", name: "Sales Representative", email: "", phone: "" };
  
  let name = u.displayName || "";
  let phone = "";
  
  try {
    const prof = await getDoc(doc(db, "users", u.uid));
    if (prof.exists()) {
      const p = prof.data() || {};
      phone = p.phone || p.phoneNumber || "";
      if (!name) {
        name = p.name || p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ");
      }
    }
  } catch {
    // ignore profile read errors
  }
  
  return { 
    uid: u.uid, 
    name: name || "Sales Representative", 
    email: u.email || "", 
    phone 
  };
}

function makeQuoteDisplayName({ clientName, city, createdAt, total }) {
  const who = (clientName || "Customer").trim();
  const when = createdAt instanceof Date
    ? createdAt
    : createdAt?.toDate?.() instanceof Date
    ? createdAt.toDate()
    : new Date();
  const whenStr = when.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  const loc = city ? ` • ${city}` : "";
  const money = Number.isFinite(Number(total)) ? ` — $${Number(total).toLocaleString()}` : "";
  return `${who}${loc} — ${whenStr}${money}`;
}

const extractQuoteId = (url) => {
  try {
    const u = new URL(url);
    return u.searchParams.get("id") || "";
  } catch {
    return "";
  }
};

/* -------------------------------- component -------------------------------- */
export default function EstimateForm() {
  const navigate = useNavigate();
  const { pricingMap: pricing } = usePricing();
  
  const [title, setTitle] = useState("");
  const [client, setClient] = useState({ name: "", address: "", clientEmail: "" });
  const [rooms, setRooms] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [preparedBy, setPreparedBy] = useState({ uid: "", name: "", email: "", phone: "" });
  const [isCheckout, setIsCheckout] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [sending, setSending] = useState(false);
  
  const itemRefsMap = useRef({});

  // Computed value from shareUrl
  const savedQuoteId = useMemo(() => extractQuoteId(shareUrl), [shareUrl]);

  // Auth check
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(() => {});
    }
  }, []);

  // Load prepared by info
  useEffect(() => {
    (async () => setPreparedBy(await getDefaultPreparedBy()))();
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Scroll to last added item
  useEffect(() => {
    rooms.forEach((_, roomIndex) => {
      const itemRefs = itemRefsMap.current[roomIndex];
      if (itemRefs?.length) {
        itemRefs[itemRefs.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, [rooms]);

  // Draft quote for preview
  const draftQuote = useMemo(
    () => ({
      id: "DRAFT",
      client: { ...client },
      rooms,
      subtotal: Number(subtotal || 0),
      tax: Number(tax || 0),
      total: Number(total || 0),
      createdAt: new Date(),
    }),
    [client, rooms, subtotal, tax, total]
  );

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const addRoom = () => setRooms((r) => [...r, { name: "", items: [] }]);

  const updateRoomName = (index, name) => {
    setRooms((r) => {
      const copy = [...r];
      copy[index].name = name;
      return copy;
    });
  };

  const removeRoom = (index) => {
    setRooms((r) => {
      const copy = [...r];
      copy.splice(index, 1);
      return copy;
    });
  };

  const getPrice = (pricingMap, item) => {
    const styleData = pricingMap?.[item.material]?.[item.series]?.[item.style];
    if (typeof styleData === "number") return styleData;
    if (styleData?.Standard) return styleData.Standard;
    return 0;
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

    setRooms((r) => {
      const copy = [...r];
      copy[roomIndex].items.push(newItem);
      return copy;
    });
  };

  const updateLineItem = (roomIndex, itemIndex, updatedItem) => {
    updatedItem.unitPrice = getPrice(pricing, updatedItem);
    setRooms((r) => {
      const copy = [...r];
      copy[roomIndex].items[itemIndex] = updatedItem;
      return copy;
    });
  };

  const removeLineItem = (roomIndex, itemIndex) => {
    setRooms((r) => {
      const copy = [...r];
      copy[roomIndex].items.splice(itemIndex, 1);
      return copy;
    });
  };

  const handleDragEnd = (result, roomIndex) => {
    if (!result.destination) return;
    setRooms((r) => {
      const copy = [...r];
      const items = [...copy[roomIndex].items];
      const [moved] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, moved);
      copy[roomIndex].items = items;
      return copy;
    });
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

  // Function to persist display name
  async function persistDisplayName(name) {
    const n = (name || "").trim();
    if (!savedQuoteId || !n) return;
    try {
      await updateDoc(doc(db, "quotes", savedQuoteId), { displayName: n });
    } catch (e) {
      console.warn("Failed to update displayName", e);
    }
  }

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
      
      const displayName = (title || "").trim() || makeQuoteDisplayName({
        clientName: client.name,
        city: undefined,
        total: Number(total || 0),
      });

      const quote = {
        displayName,
        ...creator,
        userId: user.uid,
        userEmail: user.email,
        client: { ...client },
        rooms: Array.isArray(rooms) ? rooms : [],
        subtotal: Number(subtotal || 0),
        tax: Number(tax || 0),
        total: Number(total || 0),
        createdAt: now,
        date: now,
        status: "draft",
        viewed: false,
        signed: false,
        declined: false,
        statusTimestamps: { sent: null, viewed: null, signed: null, declined: null },
        preparedBy,
        preparedByName: preparedBy.name || "",
        preparedByEmail: preparedBy.email || "",
        preparedByPhone: preparedBy.phone || "",
      };

      const docRef = await addDoc(collection(db, "quotes"), quote);
      
      const base = window.location.origin.includes("localhost")
        ? "http://localhost:3000"
        : "https://app.valdicass.com";
      const url = `${base}/view-quote?id=${docRef.id}`;
      
      setShareUrl(url);
      setShowShare(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("🔥 Save error:", error);
      alert(`❌ Error: ${error.message}`); // ✅ FIXED
    } finally {
      setIsCheckout(false);
    }
  };

  const sendQuoteEmail = async () => {
    const quoteId = extractQuoteId(shareUrl);
    
    const payload = {
      quoteId,
      clientEmail: (client.clientEmail || "").trim(),
      clientName: (client.name || "").trim(),
      total: Number(total),
      shareUrl,
      createdBy: auth?.currentUser?.uid || "WEB",
      displayName: (title || "").trim(),
    };

    const missing = [];
    if (!payload.quoteId) missing.push("quoteId");
    if (!payload.clientEmail) missing.push("clientEmail");
    if (!payload.clientName) missing.push("clientName");
    if (!Number.isFinite(payload.total)) missing.push("total");
    if (!payload.shareUrl) missing.push("shareUrl");

    if (missing.length) {
      alert(`Missing fields: ${missing.join(", ")}`); // ✅ FIXED
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
        throw new Error(json?.error || `Failed with ${res.status}`);
      }
      
      alert("✅ Email sent to client!");
      
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

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <div className="px-4 py-6 bg-gray-100">
      <div className="estimate-container max-w-5xl mx-auto bg-white p-6 rounded shadow-md">
        <img src={valdicassLogo} alt="Valdicass Logo" className="valdicass-header-logo" />

        {/* Sales Representative */}
        <div className="mb-4 border rounded-xl p-4">
          <div className="text-sm font-semibold text-slate-700 mb-2">Sales Representative</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-medium text-slate-500">
              Email
              <input
                type="email"
                name="preparedByEmail"
                className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3"
                value={preparedBy.email ?? ""}
                onChange={(e) => setPreparedBy((p) => ({ ...p, email: e.target.value }))}
                placeholder="name@valdicass.com"
                autoComplete="email"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Phone
              <input
                name="preparedByPhone"
                className="mt-1 w-full h-10 rounded-lg border border-slate-200 px-3"
                value={preparedBy.phone ?? ""}
                onChange={(e) => setPreparedBy((p) => ({ ...p, phone: e.target.value }))}
                placeholder="708-255-5231"
                autoComplete="tel"
              />
            </label>
          </div>
        </div>

        <UploadReadyQuote
          initialName={title}
          onDone={({ quoteId, shareUrl }) => {
            setShareUrl(shareUrl);
            setShowShare(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

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
              {savedQuoteId && (
                <SaveQuotePdfButton
                  quote={{ id: savedQuoteId, ...draftQuote }}
                  quoteId={savedQuoteId}
                  onSaved={(url) => console.log("Saved PDF URL:", url)}
                />
              )}
              <button 
                onClick={() => navigate("/dashboard")} 
                className="bg-black text-white px-4 py-2 rounded"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        <h1 className="form-title mb-4">Estimate Form</h1>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Estimate Name</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={(e) => persistDisplayName(e.target.value)}
            placeholder="e.g., Skura Residence — Window Replacement"
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">Shown to the client and used for downloads.</div>
        </div>

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
          itemRefsMap.current[roomIndex] = itemRefsMap.current[roomIndex] || [];
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
                          {(provided2) => (
                            <div
                              ref={(el) => {
                                if (!itemRefsMap.current[roomIndex]) itemRefsMap.current[roomIndex] = [];
                                itemRefsMap.current[roomIndex][itemIndex] = el;
                                provided2.innerRef(el);
                              }}
                              {...provided2.draggableProps}
                              {...provided2.dragHandleProps}
                            >
                              <LineItem
                                item={item}
                                index={itemIndex}
                                pricing={pricing}
                                updateLineItem={(idx, updatedItem) =>
                                  updateLineItem(roomIndex, idx, updatedItem)
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
              </DragDropContext>

              <div className="flex justify-between mt-4">
                <button
                  onClick={() => addLineItemToRoom(roomIndex)}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
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
}


