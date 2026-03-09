import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Initialize App Check (reCAPTCHA Enterprise)
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    // For local development, enable debug mode if needed
    if (import.meta.env.DEV) {
        // You can set this to true to generate a new token in the console, 
        // OR set it to your explicit debug token string from Firebase Console.
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_FIREBASE_DEBUG_TOKEN || "0b90f23b-6d56-407e-9b20-678aa5e24fa2";
    }

    initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
    });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = 'bwg-dash-1';