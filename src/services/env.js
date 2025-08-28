function req(name, value) {
  if (!value) throw new Error(`[ENV] Missing ${name}. Check your .env.local`);
  return value;
}

const RAW_BASE = import.meta.env.VITE_SENDQUOTE_API_BASE_URL || "";
export const ENV = {
  FIREBASE: {
    apiKey: req("VITE_FIREBASE_API_KEY", import.meta.env.VITE_FIREBASE_API_KEY),
    authDomain: req("VITE_FIREBASE_AUTH_DOMAIN", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId: req("VITE_FIREBASE_PROJECT_ID", import.meta.env.VITE_FIREBASE_PROJECT_ID),
    storageBucket: req("VITE_FIREBASE_STORAGE_BUCKET", import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: req("VITE_FIREBASE_MESSAGING_SENDER_ID", import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    appId: req("VITE_FIREBASE_APP_ID", import.meta.env.VITE_FIREBASE_APP_ID),
  },
  API_BASE_URL: req("VITE_SENDQUOTE_API_BASE_URL", RAW_BASE).replace(/\/$/, ""),
};
