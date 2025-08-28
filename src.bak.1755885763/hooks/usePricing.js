// hooks/usePricing.js
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const usePricing = () => {
  const [pricingMap, setPricingMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const docRef = doc(db, "settings", "pricing");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setPricingMap(docSnap.data());
          console.log("✅ Pricing loaded:", docSnap.data());
        } else {
          console.error("⚠️ No pricing found.");
        }

        setLoading(false);
      } catch (err) {
        console.error("🔥 Error fetching pricing:", err);
        setError(err);
        setLoading(false);
      }
    };

    fetchPricing();
  }, []);

  return { pricingMap, loading, error };
};

export default usePricing;





