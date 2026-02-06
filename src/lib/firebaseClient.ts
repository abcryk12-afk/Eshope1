import { getApps, initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";

function readEnv(name: string) {
  const v = process.env[name];
  return typeof v === "string" ? v : "";
}

function getFirebaseClientConfig() {
  return {
    apiKey: readEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    measurementId: readEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"),
  };
}

export function isFirebaseClientConfigured() {
  const config = getFirebaseClientConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function getFirebaseClientAuth() {
  if (getApps().length === 0) {
    const config = getFirebaseClientConfig();

    if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
      throw new Error("Firebase is not configured");
    }

    initializeApp(config);
  }

  return getAuth();
}

export async function signOutFirebaseIfConfigured() {
  if (!isFirebaseClientConfigured()) return;

  try {
    const auth = getFirebaseClientAuth();
    await signOut(auth);
  } catch {
    return;
  }
}
