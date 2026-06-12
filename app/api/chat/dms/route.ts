import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/chat/dms
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, workspaceId } = body;

    if (!targetUserId || !workspaceId) {
      return NextResponse.json(
        { error: "Target User ID and Workspace ID are required" },
        { status: 400 }
      );
    }

    const currentUserId = session.user.id;

    // Check if DM group already exists
    const existingGroup = await db.group.findFirst({
      where: {
        isDirectMessage: true,
        workspaceId,
        AND: [
          { members: { some: { id: currentUserId } } },
          { members: { some: { id: targetUserId } } }
        ]
      }
    });

    if (existingGroup) {
      return NextResponse.json({ groupId: existingGroup.id });
    }

    // Check if target user is actually in the workspace
    const subscription = await db.subscription.findFirst({
      where: {
        userId: targetUserId,
        workspaceId
      }
    });

    if (!subscription) {
      return NextResponse.json({ error: "Target user is not in this workspace" }, { status: 400 });
    }

    // Create a new DM group
    const newGroup = await db.group.create({
      data: {
        name: `DM-${currentUserId}-${targetUserId}`,
        isDirectMessage: true,
        workspaceId,
        members: {
          connect: [
            { id: currentUserId },
            { id: targetUserId }
          ]
        }
      }
    });

    return NextResponse.json({ groupId: newGroup.id });
  } catch (error) {
    console.error("Error creating DM:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
