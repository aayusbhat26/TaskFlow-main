import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { messageIds } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return new NextResponse("Message IDs are required", { status: 400 });
    }

    // Update messages to append the current user's ID to readByIds if not already there
    // Since Prisma does not natively support array append in a simple updateMany without replacing,
    // and we only want to add it if it's not there, we can do it efficiently with a raw query,
    // but Prisma's `push` operator for arrays is supported in update!
    // However, `updateMany` does not support `push`. We have to update them individually,
    // or use a raw query.
    // Alternatively, we fetch the messages, check if user.id is in readByIds, and update those that don't have it.
    
    const messages = await db.chatMessage.findMany({
      where: {
        id: { in: messageIds },
      },
      select: { id: true, readByIds: true }
    });

    const updates = messages
      .filter(m => !m.readByIds.includes(session.user.id))
      .map(m => db.chatMessage.update({
        where: { id: m.id },
        data: {
          readByIds: {
            push: session.user.id
          }
        }
      }));

    await db.$transaction(updates);

    return NextResponse.json({ success: true, count: updates.length });
  } catch (error) {
    console.error("[MESSAGES_READ]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
