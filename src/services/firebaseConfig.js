import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { ENV } from "@/services/env";

const app = getApps().length ? getApp() : initializeApp(ENV.FIREBASE);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
