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

const ROLE_SET = new Set(["user", "staff", "admin", "super_admin"]);

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
  const roleArg = process.argv[3] || "admin";
  const passwordArg = process.argv[4];
  const nameArg = process.argv[5] || "Admin";

  if (!emailArg) {
    console.error(
      "Usage: npm run promote-user -- <email> [role=admin] [passwordIfCreate] [nameIfCreate]"
    );
    process.exit(1);
  }

  if (!ROLE_SET.has(roleArg)) {
    console.error("Invalid role. Use one of: user, staff, admin, super_admin");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI. Put it in .env or set it in the shell.");
    process.exit(1);
  }

  const email = String(emailArg).trim().toLowerCase();
  const role = String(roleArg).trim();

  const client = new MongoClient(uri);

  try {
    await client.connect();

    const dbName = getDbNameFromUri(uri);
    const db = client.db(dbName);
    const users = db.collection("users");

    const existing = await users.findOne({ email });

    if (!existing) {
      if (!passwordArg) {
        console.error(
          "User not found. Provide a password to create a new user: npm run promote-user -- <email> <role> <password> <name>"
        );
        process.exit(1);
      }

      if (String(passwordArg).length < 8) {
        console.error("Password must be at least 8 characters.");
        process.exit(1);
      }

      const passwordHash = await bcrypt.hash(String(passwordArg), 12);
      const now = new Date();

      await users.insertOne({
        name: String(nameArg).trim() || "Admin",
        email,
        passwordHash,
        role,
        isBlocked: false,
        adminPermissions: [],
        cart: [],
        wishlist: [],
        createdAt: now,
        updatedAt: now,
      });

      console.log("Created user:", email, "role:", role);
      return;
    }

    await users.updateOne(
      { email },
      {
        $set: {
          role,
          isBlocked: false,
          updatedAt: new Date(),
        },
      }
    );

    console.log("Updated role for:", email, "->", role);
  } finally {
    await client.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error("Promote failed:", err);
  process.exit(1);
});
