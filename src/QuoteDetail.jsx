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

  // Helper function to safely format dates
  const formatDate = (ts) => {
    let date;
    
    // Handle Firestore Timestamp
    if (ts && typeof ts.toDate === 'function') {
      date = ts.toDate();
    }
    // Handle ISO string or regular date
    else if (ts) {
      date = new Date(ts);
    }
    // Fallback to current date
    else {
      date = new Date();
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const docRef = doc(db, "quotes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setQuote({ id: docSnap.id, ...docSnap.data() });
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

    const pdfDoc = new jsPDF();
    
    // Header
    pdfDoc.setFontSize(18);
    pdfDoc.text("Valdicass Estimate", 14, 20);
    
    // Estimate details
    pdfDoc.setFontSize(12);
    pdfDoc.text(`Estimate #: ${quote.estimateNumber || 'N/A'}`, 14, 30);
    pdfDoc.text(`Client: ${quote.clientName || quote.userEmail}`, 14, 37);
    pdfDoc.text(`Date: ${formatDate(quote.date || quote.createdAt)}`, 14, 44);
    pdfDoc.text(`Total: ${formatCurrency(quote.total)}`, 14, 51);

    let finalY = 60;

    // Check if it's new format (lineItems) or old format (rooms)
    if (quote.lineItems && quote.lineItems.length > 0) {
      // New format: Line Items
      pdfDoc.setFontSize(14);
      pdfDoc.text("Line Items:", 14, finalY);
      finalY += 8;

      const tableBody = quote.lineItems.map((item) => [
        item.description || '',
        item.quantity || 0,
        formatCurrency(item.rate || 0),
        formatCurrency(item.total || 0),
      ]);

      autoTable(pdfDoc, {
        head: [["Description", "Qty", "Rate", "Total"]],
        body: tableBody,
        startY: finalY,
        theme: "grid",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 166, 81] },
      });

      // Safely get finalY from autoTable
      finalY = pdfDoc.lastAutoTable?.finalY || finalY + 50;
    } else if (quote.rooms && quote.rooms.length > 0) {
      // Old format: Rooms
      quote.rooms.forEach((room, idx) => {
        pdfDoc.setFontSize(14);
        pdfDoc.text(`Room: ${room.name}`, 14, finalY);
        finalY += 6;
        
        const tableBody = room.items.map((item) => [
          item.type,
          item.style,
          item.quantity,
          `$${item.unitPrice}`,
          item.notes || "-",
        ]);
        
        autoTable(pdfDoc, {
          head: [["Type", "Style", "Qty", "Unit Price", "Notes"]],
          body: tableBody,
          startY: finalY,
          theme: "grid",
          styles: { fontSize: 10 },
          headStyles: { fillColor: [54, 78, 134] },
        });
        
        // Safely get finalY from autoTable
        finalY = pdfDoc.lastAutoTable?.finalY + 10 || finalY + 50;
      });
    }

    // Footer
    pdfDoc.setFontSize(10);
    pdfDoc.text(
      "Thank you for choosing Valdicass for your window and door needs.\nwww.valdicass.com | (630) 290-5343 | 8920 W 47th St, Brookfield, IL",
      14,
      finalY + 10
    );

    pdfDoc.save(`Valdicass_Estimate_${quote.estimateNumber || quote.id}.pdf`);
  };

  if (loading) return <p>Loading estimate details...</p>;
  if (!quote) return <p>Estimate not found.</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded shadow">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
      >
        ← Back to Dashboard
      </button>
      <button
        onClick={exportPDF}
        className="mb-4 ml-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        📄 Export PDF
      </button>

      <h2 className="text-xl font-bold mb-4">Estimate Details</h2>
      
      <div className="mb-6 space-y-2">
        <p>
          <strong>Estimate #:</strong> {quote.estimateNumber || 'N/A'}
        </p>
        <p>
          <strong>Client:</strong> {quote.clientName || quote.userEmail}
        </p>
        {quote.clientEmail && (
          <p>
            <strong>Email:</strong> {quote.clientEmail}
          </p>
        )}
        {quote.clientPhone && (
          <p>
            <strong>Phone:</strong> {quote.clientPhone}
          </p>
        )}
        {quote.clientAddress && (
          <p>
            <strong>Address:</strong> {quote.clientAddress}
          </p>
        )}
        <p>
          <strong>Date:</strong> {formatDate(quote.date || quote.createdAt)}
        </p>
        <p>
          <strong>Status:</strong>{' '}
          <span className={`px-2 py-1 rounded text-sm ${
            quote.status === 'sent' ? 'bg-yellow-200 text-yellow-800' :
            quote.status === 'draft' ? 'bg-gray-200 text-gray-800' :
            quote.signed ? 'bg-green-200 text-green-800' :
            'bg-blue-200 text-blue-800'
          }`}>
            {quote.signed ? 'SIGNED' : quote.status?.toUpperCase() || 'PENDING'}
          </span>
        </p>
        <p>
          <strong>Total:</strong> <span className="text-green-600 font-bold text-lg">{formatCurrency(quote.total)}</span>
        </p>
      </div>

      {/* New Format: Line Items */}
      {quote.lineItems && quote.lineItems.length > 0 && (
        <>
          <h3 className="text-lg font-bold mt-6 mb-3">Line Items:</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Rate</th>
                  <th className="border border-gray-300 px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2">{item.description}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.rate)}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 font-bold">
                  <td colSpan="3" className="border border-gray-300 px-4 py-2 text-right">Total:</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-green-600">
                    {formatCurrency(quote.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* Old Format: Rooms */}
      {quote.rooms && quote.rooms.length > 0 && (
        <>
          <h3 className="text-lg font-bold mt-6 mb-3">Rooms:</h3>
          {quote.rooms.map((room, idx) => (
            <div key={idx} className="border p-4 rounded my-3 bg-gray-50">
              <p className="font-bold mb-2">
                Room: {room.name}
              </p>
              {room.items.map((item, itemIdx) => (
                <div key={itemIdx} className="pl-4 py-1">
                  <p>
                    - {item.type} ({item.style}) | Qty: {item.quantity} | Unit: $
                    {item.unitPrice}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* Notes */}
      {quote.notes && (
        <>
          <h3 className="text-lg font-bold mt-6 mb-3">Notes:</h3>
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <p className="whitespace-pre-wrap">{quote.notes}</p>
          </div>
        </>
      )}

      {/* Salesperson Info */}
      {quote.salespersonName && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <strong>Prepared by:</strong> {quote.salespersonName}
          </p>
          {quote.salespersonEmail && (
            <p className="text-sm text-gray-600">{quote.salespersonEmail}</p>
          )}
          {quote.salespersonPhone && (
            <p className="text-sm text-gray-600">{quote.salespersonPhone}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default QuoteDetail;