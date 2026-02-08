import admin from "firebase-admin";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizePrivateKey(raw: string) {
  const trimmed = raw.trim();
  const withoutWrappingQuotes =
    trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed;

  // Normalize Windows CRLF to LF without touching the actual key content.
  const withoutCarriageReturns = withoutWrappingQuotes.split("\r").join("");

  // If stored with literal "\\n" sequences inside .env.local, convert to real newlines.
  return withoutCarriageReturns.includes("\\n")
    ? withoutCarriageReturns.split("\\n").join("\n")
    : withoutCarriageReturns;
}

function readServiceAccountFromSplitEnv() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? "";
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  const privateKey = normalizePrivateKey(privateKeyRaw);

  return {
    projectId,
    clientEmail,
    privateKey,
  } as admin.ServiceAccount;
}

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return readServiceAccountFromSplitEnv();

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) return null;

    if (typeof parsed.private_key === "string") {
      parsed.private_key = normalizePrivateKey(parsed.private_key);
    }

    return parsed as admin.ServiceAccount;
  } catch {
    return null;
  }
}

export function getFirebaseAdminAuth() {
  if (admin.apps.length === 0) {
    const serviceAccount = readServiceAccount();

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.error("[firebaseAdmin] No service account credentials found in FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_ADMIN_* env vars. Falling back to applicationDefault (this will likely fail in local dev).");
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  return admin.auth();
}
