import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/chat/search?workspaceId=xxx&query=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const groupId = searchParams.get("groupId");
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    if (!workspaceId && !groupId) {
      return NextResponse.json({ error: "Workspace ID or Group ID is required" }, { status: 400 });
    }

    let whereClause: any = {
      content: {
        contains: query,
        mode: 'insensitive',
      },
      isDeleted: false,
    };

    if (groupId) {
      // Verify user has access to this group
      const isMember = await db.group.findFirst({
        where: {
          id: groupId,
          members: { some: { id: session.user.id } },
        },
      });

      if (!isMember) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      whereClause.groupId = groupId;
    } else {
      // Verify user has access to this workspace
      const subscription = await db.subscription.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceId!,
        },
      });

      if (!subscription) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      whereClause.workspaceId = workspaceId;
    }

    const messages = await db.chatMessage.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[CHAT_SEARCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
