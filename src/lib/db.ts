import mongoose from "mongoose";

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (uri.includes("<") || uri.includes(">")) {
    throw new Error(
      "Invalid MONGODB_URI: contains '<' or '>' placeholders. Replace with your real Atlas username/password and URL-encode special characters in the password (e.g. '@' -> '%40')."
    );
  }

  const lower = uri.toLowerCase();
  if (lower.includes("your_user") || lower.includes("your_password")) {
    throw new Error(
      "Invalid MONGODB_URI: contains placeholder 'YOUR_USER' or 'YOUR_PASSWORD'. Replace them with your real MongoDB Atlas Database Access username/password."
    );
  }

  return uri;
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

type GlobalMongooseCache = typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const globalForMongoose = globalThis as GlobalMongooseCache;

const cached = globalForMongoose.mongooseCache ?? { conn: null, promise: null };

globalForMongoose.mongooseCache = cached;

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(getMongoUri(), {
        bufferCommands: false,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;

  return cached.conn;
}
