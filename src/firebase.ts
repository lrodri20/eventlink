import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { signInAnonymously, updateProfile } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";


import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Helpful in dev: make sure your keys are actually defined
if (!firebaseConfig.apiKey) {
    console.warn("[Firebase] Missing API key. Did you set EXPO_PUBLIC_FIREBASE_API_KEY in .env and restart Expo?");
}

const app = initializeApp(firebaseConfig);

// ✅ React Native persistence for Firebase Auth
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export async function ensureAnonAuth() {
    if (!auth.currentUser) {
        await signInAnonymously(auth);
    }
}

export async function setDisplayNameProfile(name: string) {
    console.log("auth.currentUser", auth.currentUser);
    if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
    }
}