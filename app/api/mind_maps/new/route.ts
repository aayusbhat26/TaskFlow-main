import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiTagSchema } from "@/schema/tagSchema";
import { NotifyType } from "@prisma/client";

import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return new Response("Unauthorized", {
      status: 400,
      statusText: "Unauthorized User",
    });
  }

  const newMindMapSchema = z.object({
    workspaceId: z.string(),
  });

  const body: unknown = await request.json();
  const result = newMindMapSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 401 });
  }

  const { workspaceId } = result.data;

  try {
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        subscriptions: {
          where: {
            workspaceId: workspaceId,
          },
          select: {
            userRole: true,
          },
        },
        _count: {
          select: {
            createdMindMaps: true,
          }
        }
      },
    });

    if (!user) {
      return new NextResponse("User not found", {
        status: 404,
        statusText: "User not Found",
      });
    }

    if (user.subscriptions[0]?.userRole === "READ_ONLY") {
      return NextResponse.json("ERRORS.NO_PERMISSION", { status: 403 });
    }

    if (user.plan === "FREE" && user._count.createdMindMaps >= 3) {
      return new NextResponse("Free plan users can only create up to 3 mind maps.", {
        status: 403,
        statusText: "Free Plan Limit Reached",
      });
    }

    if (user.plan === "PRO" && user._count.createdMindMaps >= 8) {
      return new NextResponse("Pro plan users can only create up to 8 mind maps. Upgrade to Business for unlimited.", {
        status: 403,
        statusText: "Pro Plan Limit Reached",
      });
    }

    const mindMap = await db.mindMap.create({
      data: {
        workspaceId,
        creatorId: session.user.id,
        title: "",
      },
    });

    await db.mindMap.update({
      where: {
        id: mindMap.id,
      },
      data: {
        updatedUserId: session.user.id,
      },
    });

    const workspaceUsers = await db.subscription.findMany({
      where: {
        workspaceId,
      },
      select: {
        userId: true,
      },
    });

    const notificationsData = workspaceUsers.map((user) => ({
      notifyCreatorId: session.user.id,
      userId: user.userId,
      workspaceId,
      notifyType: NotifyType.NEW_MIND_MAP,
      mindMapId: mindMap.id,
    }));

    const filterNotificationsData = notificationsData.filter(
      (data) => data.userId !== session.user.id
    );

    await db.notification.createMany({
      data: filterNotificationsData,
    });

    return NextResponse.json(mindMap, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
}
