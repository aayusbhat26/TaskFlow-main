import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { newChannelSchema } from "@/schema/channelSchema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const result = newChannelSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 400 });
  }

  const { name, type, workspaceId, categoryId, order } = result.data;

  try {
    // Check if user has permission (Admin/Owner)
    const userWorkspace = await db.subscription.findFirst({
      where: {
        workspaceId,
        userId: session.user.id,
      },
    });

    if (!userWorkspace || (userWorkspace.userRole !== "OWNER" && userWorkspace.userRole !== "ADMIN")) {
      return NextResponse.json("ERRORS.NO_PERMISSION", { status: 403 });
    }

    // @ts-ignore - Prisma client might not be fully generated yet
    const channel = await db.channel.create({
      data: {
        name: name.toLowerCase().replace(/\s+/g, '-'),
        type,
        workspaceId,
        categoryId,
        order,
      },
    });

    return NextResponse.json(channel, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
}
