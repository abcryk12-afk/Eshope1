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

    const orders = db.collection("orders");
    const returns = db.collection("returnrequests");
    const products = db.collection("products");

    console.log("Computing sold qty by productId from delivered orders...");
    const soldAgg = await orders
      .aggregate([
        { $match: { orderStatus: "Delivered" } },
        { $unwind: "$items" },
        { $group: { _id: "$items.productId", qty: { $sum: "$items.quantity" } } },
      ])
      .toArray();

    const soldMap = new Map(soldAgg.map((x) => [String(x._id), Number(x.qty ?? 0) || 0]));

    console.log("Computing returned qty by productId from completed return requests...");
    const returnedAgg = await returns
      .aggregate([
        { $match: { status: "completed" } },
        {
          $lookup: {
            from: "orders",
            localField: "orderId",
            foreignField: "_id",
            as: "order",
          },
        },
        { $unwind: "$order" },
        { $unwind: "$order.items" },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$order.items.productId", "$productId"] },
                { $eq: ["$order.items.variantId", "$variantId"] },
              ],
            },
          },
        },
        { $group: { _id: "$productId", qty: { $sum: "$order.items.quantity" } } },
      ])
      .toArray();

    const returnedMap = new Map(returnedAgg.map((x) => [String(x._id), Number(x.qty ?? 0) || 0]));

    console.log("Preparing bulk updates...");

    const productIds = new Set([...soldMap.keys(), ...returnedMap.keys()]);

    const ops = [];
    for (const pid of productIds) {
      const sold = soldMap.get(pid) ?? 0;
      const returned = returnedMap.get(pid) ?? 0;
      const next = Math.max(0, sold - returned);
      ops.push({
        updateOne: {
          filter: { _id: pid },
          update: { $set: { soldCount: next } },
        },
      });
    }

    if (ops.length === 0) {
      console.log("No soldCount updates needed.");
      return;
    }

    const res = await products.bulkWrite(ops, { ordered: false });

    console.log("Bulk update done:", {
      matched: res.matchedCount,
      modified: res.modifiedCount,
    });
  } finally {
    await client.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error("recompute-sold-count failed:", err);
  process.exit(1);
});
