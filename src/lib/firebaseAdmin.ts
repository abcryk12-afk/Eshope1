import admin from "firebase-admin";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizePrivateKey(raw: string) {
  const trimmed = raw.trim();

  const stripWrappingQuotes = (v: string) => {
    const t = v.trim();
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1);
    }
    return t;
  };

  const withoutWrappingQuotes = stripWrappingQuotes(trimmed);

  // 1) Remove actual CR characters (Windows line endings)
  const withoutActualCarriageReturns = withoutWrappingQuotes.split("\r").join("");

  // 2) Convert literal escaped CRLF/CR sequences ("\\r\\n" or "\\r")
  const withoutEscapedCarriageReturns = withoutActualCarriageReturns
    .replace(/\\r\\n/g, "\n")
    .replace(/\\r/g, "");

  // 3) Convert literal "\\n" sequences to real newlines
  return withoutEscapedCarriageReturns.replace(/\\n/g, "\n");
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
      // TEMP diagnostics (safe): helps confirm production env is wired correctly.
      // Do NOT log the private key contents.
      console.log("[firebaseAdmin] init", {
        projectId: Boolean((serviceAccount as admin.ServiceAccount).projectId),
        clientEmail: Boolean((serviceAccount as admin.ServiceAccount).clientEmail),
        privateKeyLength: String((serviceAccount as admin.ServiceAccount).privateKey ?? "").length,
        privateKeyHasBegin: String((serviceAccount as admin.ServiceAccount).privateKey ?? "").includes(
          "-----BEGIN PRIVATE KEY-----"
        ),
        privateKeyHasEnd: String((serviceAccount as admin.ServiceAccount).privateKey ?? "").includes(
          "-----END PRIVATE KEY-----"
        ),
        privateKeyLines: String((serviceAccount as admin.ServiceAccount).privateKey ?? "")
          .split("\n")
          .filter(Boolean).length,
      });

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
