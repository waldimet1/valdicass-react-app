import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const QuoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const docRef = doc(db, "quotes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setQuote(docSnap.data());
        } else {
          console.log("No such document!");
        }
      } catch (err) {
        console.error("Error fetching quote:", err);
      }
      setLoading(false);
    };
    fetchQuote();
  }, [id]);

  const exportPDF = () => {
    if (!quote) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Valdicass Quote", 14, 20);
    doc.setFontSize(12);
    doc.text(`Client Email: ${quote.userEmail}`, 14, 30);
    doc.text(`Address: ${quote.address}`, 14, 37);
    doc.text(`Date: ${quote.date.toDate().toLocaleDateString()}`, 14, 44);
    doc.text(`Total: $${quote.total.toFixed(2)}`, 14, 51);

    let finalY = 60;
    quote.rooms.forEach((room, idx) => {
      doc.setFontSize(14);
      doc.text(`Room: ${room.name}`, 14, finalY);
      finalY += 6;
      const tableBody = room.items.map((item) => [
        item.type,
        item.style,
        item.quantity,
        `$${item.unitPrice}`,
        item.notes || "-",
      ]);
      autoTable(doc, {
        head: [["Type", "Style", "Qty", "Unit Price", "Notes"]],
        body: tableBody,
        startY: finalY,
        theme: "grid",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [54, 78, 134] },
      });
      finalY = doc.previousAutoTable.finalY + 10;
    });

    doc.setFontSize(10);
    doc.text(
      "Thank you for choosing Valdicass for your window and door needs.\\nwww.valdicass.com | 708.255.5231 | 8920 W 47th St, Brookfield, IL",
      14,
      finalY + 10
    );

    doc.save(`Valdicass_Quote_${quote.address}.pdf`);
  };

  if (loading) return <p>Loading quote details...</p>;
  if (!quote) return <p>Quote not found.</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded shadow">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
      >
        ← Back to My Quotes
      </button>
      <button
        onClick={exportPDF}
        className="mb-4 ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        📄 Export PDF
      </button>
      <h2 className="text-xl font-bold mb-2">Quote Details</h2>
      <p>
        <strong>Client Email:</strong> {quote.userEmail}
      </p>
      <p>
        <strong>Address:</strong> {quote.address}
      </p>
      <p>
        <strong>Date:</strong> {quote.date.toDate().toLocaleDateString()}
      </p>
      <p>
        <strong>Total:</strong> ${quote.total.toFixed(2)}
      </p>
      <h3 className="text-lg font-bold mt-4">Rooms:</h3>
      {quote.rooms.map((room, idx) => (
        <div key={idx} className="border p-2 rounded my-2">
          <p>
            <strong>Room:</strong> {room.name}
          </p>
          {room.items.map((item, itemIdx) => (
            <div key={itemIdx} className="pl-4">
              <p>
                - {item.type} ({item.style}) | Qty: {item.quantity} | Unit: $
                {item.unitPrice}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default QuoteDetail;
