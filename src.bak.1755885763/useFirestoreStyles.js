// src/hooks/useFirestoreStyles.js
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

const useFirestoreStyles = (type) => {
  const [styles, setStyles] = useState([]);

  useEffect(() => {
    const fetchStyles = async () => {
      if (!type) return setStyles([]);
      try {
        const q = query(collection(db, "pricing"), where("type", "==", type));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => doc.data().style);
        setStyles([...new Set(fetched)]);
      } catch (err) {
        console.error("Failed to fetch styles from Firestore:", err);
        setStyles([]);
      }
    };

    fetchStyles();
  }, [type]);

  return styles;
};

export default useFirestoreStyles;
