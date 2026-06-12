import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content) {
      return new NextResponse("Content is required", { status: 400 });
    }

    const message = await db.chatMessage.findUnique({
      where: {
        id: params.messageId,
      },
    });

    if (!message) {
      return new NextResponse("Message not found", { status: 404 });
    }

    if (message.authorId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const updatedMessage = await db.chatMessage.update({
      where: {
        id: params.messageId,
      },
      data: {
        content,
        isEdited: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error("[MESSAGE_EDIT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const message = await db.chatMessage.findUnique({
      where: {
        id: params.messageId,
      },
    });

    if (!message) {
      return new NextResponse("Message not found", { status: 404 });
    }

    if (message.authorId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const deletedMessage = await db.chatMessage.update({
      where: {
        id: params.messageId,
      },
      data: {
        content: "This message was deleted.",
        isDeleted: true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(deletedMessage);
  } catch (error) {
    console.error("[MESSAGE_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
