function stripQuotes(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

async function loadDotEnvIfPresent() {
  const fs = await import("fs");
  const path = await import("path");

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
  const { MongoClient } = await import("mongodb");
  await loadDotEnvIfPresent();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI. Put it in .env or set it in the shell.");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();

    const dbName = getDbNameFromUri(uri);
    const db = client.db(dbName);
    const col = db.collection("reviews");

    const indexes = await col.indexes();

    for (const idx of indexes) {
      const key = idx.key || {};
      const isOldUnique =
        idx.unique === true &&
        key.productId === 1 &&
        key.userId === 1 &&
        Object.keys(key).length === 2;

      if (isOldUnique) {
        console.log("Dropping old unique index:", idx.name);
        await col.dropIndex(idx.name);
      }
    }

    console.log("Creating new unique index (productId, orderId, userId)...");
    await col.createIndex(
      { productId: 1, orderId: 1, userId: 1 },
      { unique: true, name: "productId_1_orderId_1_userId_1" }
    );

    console.log("Done.");
  } finally {
    await client.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
