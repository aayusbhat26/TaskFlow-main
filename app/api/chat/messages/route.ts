import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/chat/messages?workspaceId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const groupId = searchParams.get("groupId");
    const channelId = searchParams.get("channelId");

    if (!workspaceId && !groupId && !channelId) {
      return NextResponse.json(
        { error: "Workspace ID, Group ID or Channel ID is required" },
        { status: 400 }
      );
    }

    const threadId = searchParams.get("threadId");

    let whereClause: any = {};
    
    if (threadId) {
      whereClause.replyToId = threadId;
    }

    if (channelId) {
      if (!workspaceId) {
        return NextResponse.json({ error: "workspaceId required for channel" }, { status: 400 });
      }
      const subscription = await db.subscription.findFirst({
        where: { userId: session.user.id, workspaceId: workspaceId },
      });
      if (!subscription) return NextResponse.json({ error: "Access denied" }, { status: 403 });
      whereClause.channelId = channelId;
    } else if (groupId) {
      const isMember = await db.group.findFirst({
        where: { id: groupId, members: { some: { id: session.user.id } } },
      });
      if (!isMember) return NextResponse.json({ error: "Access denied to this group" }, { status: 403 });
      whereClause.groupId = groupId;
    } else if (workspaceId) {
      const subscription = await db.subscription.findFirst({
        where: { userId: session.user.id, workspaceId: workspaceId },
      });
      if (!subscription) return NextResponse.json({ error: "Access denied to this workspace" }, { status: 403 });
      whereClause.workspaceId = workspaceId;
      whereClause.groupId = null;
      whereClause.channelId = null;
    }

    // Fetch messages
    const messages = await db.chatMessage.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        // @ts-ignore
        attachments: true,
        // @ts-ignore
        reactions: {
          include: {
            user: { select: { name: true, username: true } }
          }
        },
        // @ts-ignore
        replyTo: {
          select: {
            id: true,
            content: true,
            author: { select: { username: true, name: true } }
          }
        },
        _count: {
          select: { replies: true }
        }
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100, // Limit to last 100 messages
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/chat/messages
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session:", JSON.stringify(session, null, 2));

    if (!session?.user?.id) {
      console.log("No session or user ID found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Request body:", body);
    const { content, workspaceId, groupId, channelId, attachments, replyToId } = body;

    if ((!content && (!attachments || attachments.length === 0)) || (!workspaceId && !groupId && !channelId)) {
      console.log("Missing content/attachments or workspaceId/groupId/channelId");
      return NextResponse.json(
        { error: "Content/attachments and workspace ID or Group ID or Channel ID are required" },
        { status: 400 }
      );
    }

    if (content && content.trim().length === 0 && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    if (content && content.length > 2000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    let data: any = {
      authorId: session.user.id,
    };
    if (content) {
      data.content = content.trim();
    }
    if (replyToId) {
      data.replyToId = replyToId;
    }
    if (attachments && attachments.length > 0) {
      data.attachments = {
        create: attachments.map((a: any) => ({
          filename: a.name,
          originalName: a.name,
          mimeType: a.type || 'application/octet-stream',
          size: a.size || 0,
          url: a.url,
          key: a.key,
          uploadedById: session.user.id
        }))
      };
    }

    if (channelId) {
      data.channelId = channelId;
      data.workspaceId = workspaceId;
    } else if (groupId) {
      // Verify user has access to this group
      const group = await db.group.findFirst({
        where: {
          id: groupId,
          members: {
            some: {
              id: session.user.id,
            },
          },
        },
        select: {
          id: true,
          workspaceId: true,
        },
      });

      if (!group) {
        return NextResponse.json(
          { error: "Access denied to this group" },
          { status: 403 }
        );
      }
      data.groupId = groupId;
      data.workspaceId = group.workspaceId;
    } else {
      // Verify user has access to this workspace
      console.log(
        "Checking subscription for user:",
        session.user.id,
        "workspace:",
        workspaceId
      );
      const subscription = await db.subscription.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceId,
        },
      });
      console.log("Subscription found:", subscription);

      if (!subscription) {
        return NextResponse.json(
          { error: "Access denied to this workspace" },
          { status: 403 }
        );
      }
      data.workspaceId = workspaceId;
    }

    // Create the message
    console.log("Creating message...");
    const message = await db.chatMessage.create({
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        // @ts-ignore
        attachments: true,
        // @ts-ignore
        replyTo: {
          select: {
            id: true,
            content: true,
            author: { select: { username: true, name: true } }
          }
        }
      },
    });
    console.log("Message created:", message);

    // Extract mentions
    if (content) {
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const matches = [...content.matchAll(mentionRegex)];
      const mentionedUsernames = [...new Set(matches.map(m => m[1]))];

      if (mentionedUsernames.length > 0) {
        // Find users with these usernames
        const mentionedUsers = await db.user.findMany({
          where: {
            username: { in: mentionedUsernames }
          },
          select: { id: true }
        });

        const mentionedUserIds = mentionedUsers.map(u => u.id);

        if (mentionedUserIds.length > 0) {
          // Filter to those actually in the workspace or group
          let validUserIds: string[] = [];

          if (groupId) {
            const groupMembers = await db.group.findUnique({
              where: { id: groupId },
              include: { members: { select: { id: true } } }
            });
            const memberIds = groupMembers?.members.map(m => m.id) || [];
            validUserIds = mentionedUserIds.filter(id => memberIds.includes(id));
          } else {
            const workspaceMembers = await db.subscription.findMany({
              where: { workspaceId: workspaceId! },
              select: { userId: true }
            });
            const memberIds = workspaceMembers.map(m => m.userId);
            validUserIds = mentionedUserIds.filter(id => memberIds.includes(id));
          }

          // Don't mention the author themselves
          validUserIds = validUserIds.filter(id => id !== session.user.id);

          if (validUserIds.length > 0) {
            await db.messageMention.createMany({
              data: validUserIds.map(userId => ({
                messageId: message.id,
                userId
              }))
            });
            console.log(`Created mentions for users: ${validUserIds.join(', ')}`);
          }
        }
      }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
