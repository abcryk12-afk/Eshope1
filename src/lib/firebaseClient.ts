import { getApps, initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";

function getFirebaseClientConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "";
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "";
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "";
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "";

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
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
