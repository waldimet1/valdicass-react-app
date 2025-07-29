import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const usePricing = () => {
  const [pricingMap, setPricingMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'pricing'));
        const pricing = {};
        snapshot.forEach((doc) => {
          pricing[doc.id] = doc.data();
        });
        setPricingMap(pricing);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, []);

  return { pricingMap, loading, error };
};

export default usePricing;
