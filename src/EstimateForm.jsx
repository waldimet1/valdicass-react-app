// src/EstimateForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import LineItem from "./LineItem";
import valdicassLogo from "./assets/valdicass-logo.png";
import greenskyLogo from "./assets/greensky-logo.jpeg";
import "./EstimateForm.css";
import usePricing from "./hooks/usePricing";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useNavigate } from "react-router-dom";

const EstimateForm = () => {
  const [client, setClient] = useState({ name: "", address: "", clientEmail: "" });
  const [rooms, setRooms] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [isCheckout, setIsCheckout] = useState(false);
  const { pricingMap: pricing } = usePricing();
  const navigate = useNavigate();
const [shareUrl, setShareUrl] = useState("");
const [showShare, setShowShare] = useState(false);
const [sending, setSending] = useState(false);

  // One ref object to store item refs per room
  const itemRefsMap = useRef({});

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
      uid: crypto.randomUUID?.() || Date.now().toString(),
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

const saveQuoteToFirestore = async () => {
  setIsCheckout(true);
  if (!auth.currentUser) {
    alert("You must be logged in.");
    return;
  }
  if (!client.name || !client.address || !client.clientEmail) {
    alert("❌ Please fill out all client info.");
    return;
  }

  try {
    const now = Timestamp.now();
    const quote = {
      client,
      rooms,
      subtotal,
      tax,
      total,
      // ✅ status model (so it shows under “Sent”)
      status: "sent",
      viewed: false,
      signed: false,
      declined: false,
      statusTimestamps: {
        sent: now,
        viewed: null,
        signed: null,
        declined: null,
      },
      createdAt: now,
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      date: now,
    };

    const docRef = await addDoc(collection(db, "quotes"), quote);

    // Build client link (use your production domain)
    const base = window.location.origin.includes("localhost")
      ? "http://localhost:3000"
      : "https://app.valdicass.com";
    const url = `${base}/view-quote?id=${docRef.id}`;

    setShareUrl(url);
    setShowShare(true);

    // optional: scroll to top to reveal the panel
    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (error) {
    console.error("🔥 Save error:", error);
    alert(`❌ Error: ${error.message}`);
  } finally {
    setIsCheckout(false);
  }
};
const sendQuoteEmail = async () => {
  if (!shareUrl) return;
  try {
    setSending(true);
    const res = await fetch("https://valdicass-sendquote-api.vercel.app
/sendQuoteEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // You can pass more details if your server expects them
        clientEmail: client.clientEmail,
        clientName: client.name,
        shareUrl,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Failed to send");
    alert("✅ Email sent to client!");
  } catch (e) {
    console.error(e);
    alert("❌ Could not send email. Check server logs or endpoint.");
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

        {/* Client Info */}
        <input name="name" value={client.name} onChange={handleClientChange} placeholder="Client Name" />
        <input name="address" value={client.address} onChange={handleClientChange} placeholder="Job Address" />
        <input name="clientEmail" value={client.clientEmail} onChange={handleClientChange} placeholder="Client Email" type="email" />

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
                <Droppable
                  droppableId={`room-${roomIndex}`}
                  isDropDisabled={false}
                  isCombineEnabled={false}
                  ignoreContainerClipping={false}
                >
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
              </DragDropContext>

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























