let fs;
let path;
let bcrypt;
let MongoClient;

function stripQuotes(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function loadDotEnvIfPresent() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = stripQuotes(trimmed.slice(idx + 1).trim());

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getDbNameFromUri(uri) {
  try {
    const url = new URL(uri);
    const name = (url.pathname || "").replace(/^\//, "");
    return name || "test";
  } catch {
    return "test";
  }
}

async function main() {
  fs = await import("node:fs");
  path = await import("node:path");

  const bcryptMod = await import("bcryptjs");
  bcrypt = bcryptMod.default ?? bcryptMod;

  const mongodbMod = await import("mongodb");
  MongoClient = mongodbMod.MongoClient ?? mongodbMod.default?.MongoClient;

  if (!MongoClient) {
    console.error("Failed to load MongoClient from mongodb package.");
    process.exit(1);
  }

  loadDotEnvIfPresent();

  const emailArg = process.argv[2];
  const passwordArg = process.argv[3];

  if (!emailArg || !passwordArg) {
    console.error("Usage: npm run reset-password -- <email> <newPassword>");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI. Put it in .env or set it in the shell.");
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const newPassword = String(passwordArg);

  if (newPassword.length < 8) {
    console.error("New password must be at least 8 characters.");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();

    const dbName = getDbNameFromUri(uri);
    const db = client.db(dbName);

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const result = await db.collection("users").updateOne(
      { email },
      { $set: { passwordHash } }
    );

    if (result.matchedCount === 0) {
      console.error("No user found with that email:", email);
      process.exit(1);
    }

    console.log("Password updated for:", email);
  } finally {
    await client.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
