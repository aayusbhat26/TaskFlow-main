import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("Workspace ID is required", { status: 400 });
  }

  try {
    // Check if user belongs to workspace
    const userWorkspace = await db.subscription.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
      },
    });

    if (!userWorkspace) {
      return NextResponse.json("ERRORS.NO_PERMISSION", { status: 403 });
    }

    // @ts-ignore
    const categories = await db.channelCategory.findMany({
      where: { workspaceId },
      include: {
        channels: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    // @ts-ignore
    const uncategorizedChannels = await db.channel.findMany({
      where: {
        workspaceId,
        categoryId: null,
      },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ categories, uncategorizedChannels }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
}
