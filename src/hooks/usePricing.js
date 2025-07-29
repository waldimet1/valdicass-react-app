// hooks/usePricing.js
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

const usePricing = () => {
  const [pricingMap, setPricingMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const snapshot = await getDocs(collection(db, "pricing"));
        const map = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const key = `${data.type}_${data.style}`; // e.g., "Window_Casement"
          map[key] = data.unitPrice;
        });
        setPricingMap(map);
        setLoading(false);
      } catch (err) {
        console.error("🔥 Error fetching pricing data:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchPricing();
  }, []);

  return { pricingMap, loading, error };
};

export default usePricing;



