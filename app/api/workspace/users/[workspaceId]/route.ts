import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

interface Params {
  params: {
    workspaceId: string;
  };
}

export async function GET(request: Request, { params: { workspaceId } }: Params) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", {
      status: 401,
      statusText: "Unauthorized User",
    });
  }

  try {
    // Check if user has access to this workspace
    const userWorkspaceAccess = await db.subscription.findFirst({
      where: {
        workspaceId: workspaceId,
        userId: session.user.id
      }
    });

    if (!userWorkspaceAccess) {
      return NextResponse.json("ERRORS.WORKSPACE_ACCESS_DENIED", { status: 403 });
    }

    // Get all workspace members
    const workspaceUsers = await db.subscription.findMany({
      where: {
        workspaceId: workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            surname: true,
            image: true,
            isOnline: true,
            lastSeen: true
          }
        }
      }
    });

    const users = workspaceUsers.map(subscription => ({
      id: subscription.user.id,
      userId: subscription.user.id,
      username: subscription.user.username,
      name: subscription.user.name,
      surname: subscription.user.surname,
      image: subscription.user.image,
      isOnline: subscription.user.isOnline,
      lastSeen: subscription.user.lastSeen,
      role: subscription.userRole
    }));

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching workspace users:", error);
    return NextResponse.json("ERRORS.GENERAL_ERROR", { status: 500 });
  }
}
