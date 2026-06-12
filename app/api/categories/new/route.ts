import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { newChannelCategorySchema } from "@/schema/channelSchema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const result = newChannelCategorySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 400 });
  }

  const { name, workspaceId, order } = result.data;

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

    // @ts-ignore
    const category = await db.channelCategory.create({
      data: {
        name,
        workspaceId,
        order,
      },
    });

    return NextResponse.json(category, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 500 });
  }
}
