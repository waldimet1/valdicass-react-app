import React, { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import LineItem from "./LineItem";
import valdicassLogo from "./assets/valdicass-logo.png";
import greenskyLogo from "./assets/greensky-logo.jpeg";
import "./EstimateForm.css";
import usePricing from "./hooks/usePricing";

const EstimateForm = () => {
  const [client, setClient] = useState({
    name: "",
    address: "",
    clientEmail: "",
  });

  const [rooms, setRooms] = useState([]);
  const { pricing, loading } = usePricing();

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const addRoom = () => {
    setRooms([...rooms, { name: "", items: [] }]);
  };

  const updateRoomName = (index, name) => {
    const updatedRooms = [...rooms];
    updatedRooms[index].name = name;
    setRooms(updatedRooms);
  };

  const addLineItemToRoom = (roomIndex) => {
    const defaultType = "Window";
    const defaultStyle = "Casement";
    const basePrice = pricing?.[defaultType]?.[defaultStyle] || 0;

    const newItem = {
      location: "",
      width: "",
      height: "",
      type: defaultType,
      style: defaultStyle,
      venting: "",
      material: "",
      series: "",
      jambSize: "",
      colorExt: "",
      colorInt: "",
      installMethod: "",
      quantity: 1,
      unitPrice: basePrice,
      notes: "",
    };

    const updatedRooms = [...rooms];
    updatedRooms[roomIndex].items.push(newItem);
    setRooms(updatedRooms);
  };

  const updateLineItem = (roomIndex, itemIndex, updatedItem) => {
    const basePrice =
      pricing?.[updatedItem.type]?.[updatedItem.style] || 0;
    updatedItem.unitPrice = basePrice;

    const updatedRooms = [...rooms];
    updatedRooms[roomIndex].items[itemIndex] = updatedItem;
    setRooms(updatedRooms);
  };

  const subtotal = rooms.reduce((total, room) => {
    const roomTotal = room.items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
      0
    );
    return total + roomTotal;
  }, 0);

  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const saveQuoteToFirestore = async () => {
    if (!auth.currentUser) {
      alert("You must be logged in to save.");
      return;
    }

    try {
      const quote = {
        client,
        rooms,
        subtotal,
        tax,
        total,
        viewed: false,
        createdAt: Timestamp.now(),
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        date: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "quotes"), quote);
      console.log("✅ Quote saved with ID:", docRef.id);
      alert("✅ Quote saved to cloud!");
    } catch (error) {
      console.error("🔥 Error saving quote to Firestore:", error);
      alert(`❌ Failed to save quote: ${error.message}`);
    }
  };

  return (
    <div className="estimate-wrapper">
      <div className="estimate-container">
        <img
          src={valdicassLogo}
          alt="Valdicass Logo"
          className="valdicass-header-logo"
        />

        <h1 className="form-title">Estimate Form</h1>

        {/* 💼 Client Info */}
        <input
          name="name"
          value={client.name}
          onChange={handleClientChange}
          placeholder="Client Name"
        />
        <input
          name="address"
          value={client.address}
          onChange={handleClientChange}
          placeholder="Job Address"
        />
        <input
          name="clientEmail"
          value={client.clientEmail}
          onChange={handleClientChange}
          placeholder="Client Email"
          type="email"
        />

        {/* 🏠 Rooms */}
        {rooms.map((room, roomIndex) => (
          <div key={roomIndex}>
            <input
              placeholder="Room Name (e.g., Kitchen)"
              value={room.name}
              onChange={(e) => updateRoomName(roomIndex, e.target.value)}
            />
            {room.items.map((item, itemIndex) => (
              <LineItem
                key={itemIndex}
                item={item}
                index={itemIndex}
                updateLineItem={(index, updatedItem) =>
                  updateLineItem(roomIndex, index, updatedItem)
                }
              />
            ))}
            <button onClick={() => addLineItemToRoom(roomIndex)}>
              + Add Item to {room.name || "Room"}
            </button>
          </div>
        ))}

        {/* ➕ Add Room */}
        <button onClick={addRoom}>+ Add Room</button>

        {/* 💰 Totals */}
        <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
          <p>Subtotal: ${subtotal.toFixed(2)}</p>
          <p>Tax (8%): ${tax.toFixed(2)}</p>
          <p>
            <strong>Total: ${total.toFixed(2)}</strong>
          </p>
        </div>

        <button onClick={saveQuoteToFirestore}>💾 Save Quote to Cloud</button>

        <img
          src={greenskyLogo}
          alt="GreenSky Financing"
          className="greensky-footer-logo"
        />
      </div>
    </div>
  );
};

export default EstimateForm;







