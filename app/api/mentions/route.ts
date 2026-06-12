import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/mentions?unreadOnly=true
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const whereClause: any = {
      userId: session.user.id,
    };

    if (unreadOnly) {
      whereClause.read = false;
    }

    const mentions = await db.messageMention.findMany({
      where: whereClause,
      include: {
        message: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
            workspace: {
              select: { name: true }
            },
            group: {
              select: { name: true }
            }
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json(mentions);
  } catch (error) {
    console.error("Error fetching mentions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/mentions
// Body: { mentionId: string, read: boolean }
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mentionId, read } = body;

    if (!mentionId) {
      return NextResponse.json({ error: "mentionId is required" }, { status: 400 });
    }

    const mention = await db.messageMention.findUnique({
      where: { id: mentionId }
    });

    if (!mention) {
      return NextResponse.json({ error: "Mention not found" }, { status: 404 });
    }

    if (mention.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedMention = await db.messageMention.update({
      where: { id: mentionId },
      data: { read: read ?? true }
    });

    return NextResponse.json(updatedMention);
  } catch (error) {
    console.error("Error updating mention:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
