import React, { useState, useEffect } from "react";
import usePricing from "./hooks/usePricing";

const LineItem = ({ item, index, updateLineItem }) => {
  const { pricingMap, loading } = usePricing();
  const [touched, setTouched] = useState(false);

  const windowStyles = [
    "Casement", "Double-Hung", "Sliding", "Awning", "Hopper", "Fixed",
    "Single-Hung", "Special Shape", "Bay", "Bow"
  ];
  const doorStyles = ["Sliding", "French", "Folding", "Multislide"];

  const pellaSeries = ["Reserve", "Lifestyle"];
  const pellaReserveInterior = [
    "natural", "black stain", "golden oak", "early american", "provincial",
    "Dark Mahogany", "Charcoal", "Bright White", "white", "linen white", "primed", "custom color"
  ];
  const pellaReserveExterior = [
    "black", "white", "classic white", "brown", "fossil", "iron ore", "portobello", "putty",
    "almond", "brick red", "Hartford Green", "Wolf Gray", "Soft Linen", "Satin Steel",
    "Matte Gray", "Spice Red", "Sage", "Blue Ash", "Frost Blue"
  ];
  const pellaLifestyleInterior = ["black stain", "golden oak", "early american", "provincial"];
  const pellaLifestyleExterior = [
    "black", "white", "classic white", "brown", "fossil", "iron ore", "portobello", "putty",
    "almond", "brick red", "Hartford Green", "Wolf Gray"
  ];

  const jambSizes = [
    '3 11/16"', '4 9/16"', '5 9/16"', '6 9/16"', '7 9/16"', '8 9/16"', '9 9/16"'
  ];
  const ventingOptions = ["Left", "Right", "Top", "Bottom"];
  const installMethods = ["Full-frame", "Pocket"];
  const materialOptions = ["Pella", "ProVia"];
  const seriesOptions = pellaSeries;

  const showError = (field) => touched && !item[field];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...item, [name]: value };

    if (name === "type" || name === "style") {
      const price = pricingMap?.[updated.type]?.[updated.style] || 0;
      updated.unitPrice = price;
    }

    updateLineItem(index, updated);
  };

  const getInteriorColors = () => {
    if (item.series === "Reserve") return pellaReserveInterior;
    if (item.series === "Lifestyle") return pellaLifestyleInterior;
    return [];
  };

  const getExteriorColors = () => {
    if (item.series === "Reserve") return pellaReserveExterior;
    if (item.series === "Lifestyle") return pellaLifestyleExterior;
    return [];
  };

  const getStyleOptions = () => {
    return item.type === "Door" ? doorStyles : windowStyles;
  };

  useEffect(() => {
    setTouched(true);
  }, []);

  return (
    <div
      className="line-item"
      style={{
        border: "2px solid #4caf50",
        borderRadius: "10px",
        padding: "16px",
        marginBottom: "24px",
        backgroundColor: "#fefefe",
      }}
    >
      <input
        name="location"
        placeholder="Location (e.g., Left Wall)"
        value={item.location}
        onChange={handleChange}
        style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
        <select name="type" value={item.type} onChange={handleChange}>
          <option value="Window">Window</option>
          <option value="Door">Door</option>
        </select>

        <select name="style" value={item.style} onChange={handleChange}>
          <option value="">Style</option>
          {getStyleOptions().map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select name="installMethod" value={item.installMethod} onChange={handleChange}>
          <option value="">Install</option>
          {installMethods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select name="material" value={item.material} onChange={handleChange}>
          <option value="">Material</option>
          {materialOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select name="series" value={item.series} onChange={handleChange}>
          <option value="">Series</option>
          {seriesOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
        <select name="colorExt" value={item.colorExt} onChange={handleChange}>
          <option value="">Exterior</option>
          {getExteriorColors().map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select name="colorInt" value={item.colorInt} onChange={handleChange}>
          <option value="">Interior</option>
          {getInteriorColors().map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select name="jambSize" value={item.jambSize} onChange={handleChange}>
          <option value="">Jamb</option>
          {jambSizes.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>

        <select name="venting" value={item.venting} onChange={handleChange}>
          <option value="">Venting</option>
          {ventingOptions.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="number"
          name="width"
          value={item.width}
          onChange={handleChange}
          placeholder="Width"
        />
        <input
          type="number"
          name="height"
          value={item.height}
          onChange={handleChange}
          placeholder="Height"
        />
        <input
          type="number"
          name="quantity"
          value={item.quantity}
          onChange={handleChange}
          placeholder="Quantity"
        />
        <input
          type="number"
          name="unitPrice"
          value={item.unitPrice}
          readOnly
          placeholder="Unit Price"
        />
      </div>

      <textarea
        name="notes"
        value={item.notes}
        onChange={handleChange}
        placeholder="Notes (optional)"
        rows={2}
        style={{ marginTop: "10px", width: "100%" }}
      />
    </div>
  );
};

export default LineItem;








