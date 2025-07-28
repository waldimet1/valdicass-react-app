import React, { useEffect, useState } from "react";
import usePricing from "./hooks/usePricing";
import Tooltip from "./components/Tooltip"; // make sure path matches

// ... (constants like jambSizes, colors, etc.)

const LineItem = ({ item, index, updateLineItem }) => {
  const { pricingMap, loading, error } = usePricing();
  const [touched, setTouched] = useState(false);

  const showError = (field) => !item[field] && touched;

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateLineItem(index, { ...item, [name]: value });
  };

  const getColorOptions = () => {
    if (item.series === "Reserve") return { int: reserveInteriorColors, ext: reserveExteriorColors };
    if (item.series === "Lifestyle") return { int: lifestyleInteriorColors, ext: lifestyleExteriorColors };
    return { int: [], ext: [] };
  };
  const colorsBySeries = getColorOptions();

  useEffect(() => {
    if (!item.type || !item.style || !item.installMethod) return;
    const key = `${item.type}_${item.style}`;
    const basePrice = pricingMap[key] || 0;
    const modifier = item.installMethod === "Full-frame" ? 1.2 : 1.0;
    const finalPrice = Math.round(basePrice * modifier);
    updateLineItem(index, { ...item, unitPrice: finalPrice });
  }, [item.type, item.style, item.installMethod, pricingMap]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
      <Tooltip text="Select window or door type">
        <select name="type" value={item.type || ""} onChange={handleChange}
          className={`p-2 border rounded ${showError("type") ? "border-red-500" : "border-gray-300"}`}>
          <option value="">Select Type</option>
          <option value="Window">Window</option>
          <option value="Door">Door</option>
        </select>
      </Tooltip>

      <Tooltip text="Choose the style for the selected type">
        <select name="style" value={item.style || ""} onChange={handleChange}
          className={`p-2 border rounded ${showError("style") ? "border-red-500" : "border-gray-300"}`}>
          <option value="">Select Style</option>
          {(item.type === "Window" ? [...baseStyles, ...windowStyles] : item.type === "Door" ? doorStyles : []).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Tooltip>

      <Tooltip text="Installation method affects final price. Full-frame is more involved.">
        <select name="installMethod" value={item.installMethod || ""} onChange={handleChange}
          className={`p-2 border rounded ${showError("installMethod") ? "border-red-500" : "border-gray-300"}`}>
          <option value="">Install Method</option>
          {installMethods.map((i) => <option key={i}>{i}</option>)}
        </select>
      </Tooltip>

      <Tooltip text="Select the product material.">
        <select name="material" value={item.material || ""} onChange={handleChange}
          className={`p-2 border rounded ${showError("material") ? "border-red-500" : "border-gray-300"}`}>
          <option value="">Select Material</option>
          {materials.map((m) => <option key={m}>{m}</option>)}
        </select>
      </Tooltip>

      <Tooltip text="Series varies by brand. Choose Reserve or Lifestyle for Pella.">
        <select name="series" value={item.series || ""} onChange={handleChange}
          className={`p-2 border rounded ${showError("series") ? "border-red-500" : "border-gray-300"}`}>
          <option value="">Select Series</option>
          {(item.material === "Pella" ? pellaSeries : item.material === "ProVia" ? proviaSeries : []).map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Tooltip>

      {/* Add more <Tooltip> components similarly around other inputs or dropdowns */}

      {/* Example without tooltip */}
      <input
        type="number"
        name="unitPrice"
        value={item.unitPrice || 0}
        disabled
        className="p-2 border rounded bg-gray-100 text-gray-700 cursor-not-allowed"
      />
    </div>
  );
};

export default LineItem;

