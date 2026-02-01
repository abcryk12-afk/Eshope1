import { dbConnect } from "@/lib/db";
import UserMessage from "@/models/UserMessage";

export async function createUserMessage(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
  relatedOrderId?: string | null;
}) {
  const userId = String(input.userId ?? "").trim();

  if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
    return null;
  }

  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  const type = String(input.type ?? "").trim();

  if (!title || !body || !type) {
    return null;
  }

  const relatedOrderId = input.relatedOrderId && /^[a-fA-F0-9]{24}$/.test(String(input.relatedOrderId))
    ? String(input.relatedOrderId)
    : null;

  await dbConnect();

  const doc = await UserMessage.create({
    userId,
    title: title.slice(0, 160),
    body: body.slice(0, 5000),
    type: type.slice(0, 60),
    relatedOrderId: relatedOrderId || null,
    isRead: false,
  });

  return doc._id.toString();
}
