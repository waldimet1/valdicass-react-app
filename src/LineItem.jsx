// LineItem.jsx
import React, { useEffect, useState } from "react";
import usePricing from "./hooks/usePricing";

const windowStyles = [
  "Awning", "Casement", "Curved-Top", "Double-Hung", "Fixed", "Single-Hung", "Sliding Window"
];
const doorStyles = ["Sliding-Door", "French", "Folding", "Multislide"];
const ventingOptions = ["Left", "Right", "Top", "Bottom"];
const materials = ["Pella", "ProVia"];
const pellaSeries = ["Reserve", "Lifestyle", "Impervia", "250 Series"];
const proviaSeries = ["Aeris", "Endure", "Aspect", "ecoLite"];
const installMethods = ["Full-frame", "Pocket"];

const reserveInteriorColors = [
  "natural", "black stain", "golden oak", "early american", "provincial",
  "Dark Mahogany", "Charcoal", "Bright White", "white", "linen white", "primed", "custom color"
];
const reserveExteriorColors = [
  "black", "white", "classic white", "brown", "fossil", "iron ore", "portobello", "putty", "almond",
  "brick red", "Hartford Green", "Wolf Gray", "Soft Linen", "Satin Steel", "Matte Gray",
  "Spice Red", "Sage", "Blue Ash", "Frost Blue"
];
const lifestyleInteriorColors = [
  "black stain", "golden oak", "early american", "provincial"
];
const lifestyleExteriorColors = [
  "black", "white", "classic white", "brown", "fossil", "iron ore",
  "portobello", "putty", "almond", "brick red", "Hartford Green", "Wolf Gray"
];

const LineItem = ({ item, index, updateLineItem, removeLineItem }) => {
  const [touched, setTouched] = useState(false);
  const { pricingMap: pricing } = usePricing();

  const showError = (field) => !item[field] && touched;

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateLineItem(index, { ...item, [name]: value });
  };

  const getColorOptions = () => {
    if (item.series === "Reserve") {
      return { int: reserveInteriorColors, ext: reserveExteriorColors };
    }
    if (item.series === "Lifestyle") {
      return { int: lifestyleInteriorColors, ext: lifestyleExteriorColors };
    }
    return { int: [], ext: [] };
  };

  const getPrice = (pricingMap, item) => {
    if (!pricingMap || !item.material || !item.series || !item.style) return 0;
    const seriesData = pricingMap[item.material]?.[item.series];
    if (!seriesData) return 0;

    // Try direct match
    if (typeof seriesData[item.style] === "number") {
      return seriesData[item.style];
    }

    // Try nested category match
    for (const key in seriesData) {
      if (typeof seriesData[key] === "object" && typeof seriesData[key][item.style] === "number") {
        return seriesData[key][item.style];
      }
    }

    return 0;
  };

  const colorsBySeries = getColorOptions();

  useEffect(() => {
    const unitPrice = getPrice(pricing, item);
    updateLineItem(index, { ...item, unitPrice });
    console.log("💵 Price lookup:", item.material, item.series, item.style, "=", unitPrice);
    // eslint-disable-next-line
  }, [item.material, item.series, item.style]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-lg bg-gray-50 relative">
      <input
        name="location"
        value={item.location || ""}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder="Location"
        className={`p-2 border rounded ${showError("location") ? "border-red-500" : "border-gray-300"}`}
      />

      <input
        name="width"
        value={item.width || ""}
        onChange={handleChange}
        placeholder="Width (in)"
        className={`p-2 border rounded ${showError("width") ? "border-red-500" : "border-gray-300"}`}
      />

      <input
        name="height"
        value={item.height || ""}
        onChange={handleChange}
        placeholder="Height (in)"
        className={`p-2 border rounded ${showError("height") ? "border-red-500" : "border-gray-300"}`}
      />

      <select
        name="type"
        value={item.type || ""}
        onChange={handleChange}
        className={`p-2 border rounded ${showError("type") ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Select Type</option>
        <option value="Window">Window</option>
        <option value="Door">Door</option>
      </select>

      <select
        name="style"
        value={item.style || ""}
        onChange={handleChange}
        className={`p-2 border rounded ${showError("style") ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Select Style</option>
        {(item.type === "Window" ? windowStyles : item.type === "Door" ? doorStyles : []).map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      <select
        name="venting"
        value={item.venting || ""}
        onChange={handleChange}
        className={`p-2 border rounded ${showError("venting") ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Venting</option>
        {ventingOptions.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>

      <select
        name="material"
        value={item.material || ""}
        onChange={handleChange}
        className={`p-2 border rounded ${showError("material") ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Select Material</option>
        {materials.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <select
        name="series"
        value={item.series || ""}
        onChange={handleChange}
        className={`p-2 border rounded ${showError("series") ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Select Series</option>
        {(item.material === "Pella"
          ? pellaSeries
          : item.material === "ProVia"
          ? proviaSeries
          : []
        ).map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>

      <select
        name="colorExt"
        value={item.colorExt || ""}
        onChange={handleChange}
        className={`p-2 border rounded ${showError("colorExt") ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Exterior Color</option>
        {colorsBySeries.ext.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>

      <select
        name="colorInt"
        value={item.colorInt || ""}
        onChange={handleChange}
        className={`p-2 border rounded ${showError("colorInt") ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Interior Color</option>
        {colorsBySeries.int.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>

      <select
        name="installMethod"
        value={item.installMethod || ""}
        onChange={handleChange}
        className={`p-2 border rounded ${showError("installMethod") ? "border-red-500" : "border-gray-300"}`}
      >
        <option value="">Install Method</option>
        {installMethods.map((i) => (
          <option key={i}>{i}</option>
        ))}
      </select>

      <input
        type="number"
        name="quantity"
        value={item.quantity || ""}
        onChange={handleChange}
        placeholder="Qty"
        className={`p-2 border rounded ${showError("quantity") ? "border-red-500" : "border-gray-300"}`}
      />

      <input
        type="number"
        name="unitPrice"
        value={item.unitPrice || 0}
        disabled
        className="p-2 border rounded bg-gray-100 text-gray-700 cursor-not-allowed"
      />

      <input
        name="notes"
        value={item.notes || ""}
        onChange={handleChange}
        placeholder="Optional Notes"
        className="p-2 border rounded col-span-2"
      />

      <button
        onClick={removeLineItem}
        className="text-red-500 text-sm mt-2 hover:underline"
      >
        🗑️ Remove Item
      </button>
    </div>
  );
};

export default LineItem;








