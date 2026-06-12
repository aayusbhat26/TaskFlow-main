import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/chat/messages/react
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { messageId, emoji } = body;

    if (!messageId || !emoji) {
      return NextResponse.json(
        { error: "Message ID and emoji are required" },
        { status: 400 }
      );
    }

    // Check if reaction already exists from this user
    const existing = await db.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: session.user.id,
          emoji,
        },
      },
    });

    if (existing) {
      // Toggle off (remove reaction)
      await db.messageReaction.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ status: "removed" });
    } else {
      // Toggle on (add reaction)
      const reaction = await db.messageReaction.create({
        data: {
          messageId,
          userId: session.user.id,
          emoji,
        },
        include: {
          user: {
            select: { name: true, username: true }
          }
        }
      });
      return NextResponse.json({ status: "added", reaction });
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
