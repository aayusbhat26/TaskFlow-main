import { db } from "@/lib/db";
import { sortMindMapsAndTasksDataByUpdatedAt } from "@/lib/sortMindMapsAndTasksDataByUpdatedAt";
import { WorkspaceRecentActivity } from "@/types/extended";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const workspaceId = url.searchParams.get("workspaceId");

  if (!userId || !workspaceId)
    return NextResponse.json("ERRORS.NO_WRONG_DATA", { status: 404 });

  try {
    const workspaceData = await db.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: {
        tasks: {
          include: {
            assignedToTask: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                  },
                },
              },
            },
            tags: {
              select: {
                id: true,
                color: true,
                name: true,
                workspaceId: true,
              },
            },
            updatedBy: {
              select: {
                username: true,
                name: true,
                id: true,
                image: true,
                surname: true,
              },
            },
            savedTask: {
              where: {
                userId,
              },
              select: {
                taskId: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 10,
        },
        mindMaps: {
          include: {
            assignedToMindMap: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                  },
                },
              },
            },
            tags: {
              select: {
                id: true,
                color: true,
                name: true,
                workspaceId: true,
              },
            },
            updatedBy: {
              select: {
                username: true,
                name: true,
                id: true,
                image: true,
                surname: true,
              },
            },
            savedMindMaps: {
              where: {
                userId,
              },
              select: {
                mindMapId: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 10,
        },
        notes: {
          include: {
            author: { select: { id: true, username: true, image: true, name: true, surname: true } },
            tags: { select: { id: true, color: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 10,
        },
        pomodoroSessions: {
          include: {
            user: { select: { id: true, username: true, image: true, name: true, surname: true } },
          },
          orderBy: { completedAt: "desc" },
          take: 10,
        },
        groups: {
          orderBy: { updatedAt: "desc" },
          take: 10,
        },
        channels: {
          orderBy: { updatedAt: "desc" },
          take: 10,
        },
      },
    });

    const mindMapInfo: WorkspaceRecentActivity[] = workspaceData
      ? workspaceData.mindMaps.map((mindMap) => {
          return {
            id: mindMap.id,
            title: mindMap.title,
            emoji: mindMap.emoji,
            type: "mindMap",
            updated: {
              at: mindMap.updatedAt,
              by: mindMap.updatedBy,
            },
            starred: mindMap.savedMindMaps.length > 0,
            tags: mindMap.tags,
            assignedTo: mindMap.assignedToMindMap,
            link: `/dashboard/workspace/${workspaceId}/mind-maps/mind-map/${mindMap.id}`,
          };
        })
      : [];

    const taskInfo: WorkspaceRecentActivity[] = workspaceData
      ? workspaceData.tasks.map((task) => {
          return {
            id: task.id,
            title: task.title,
            emoji: task.emoji,
            type: "task",
            updated: {
              at: task.updatedAt,
              by: task.updatedBy,
            },
            starred: task.savedTask.length > 0,
            tags: task.tags,
            assignedTo: task.assignedToTask,
            priority: task.priority as any,
            link: `/dashboard/workspace/${workspaceId}/tasks/task/${task.id}`,
          };
        })
      : [];

    const noteInfo: WorkspaceRecentActivity[] = workspaceData
      ? workspaceData.notes.map((note) => ({
          id: note.id,
          title: note.title || "Untitled",
          emoji: note.icon || "📝",
          type: "note",
          updated: {
            at: note.updatedAt,
            by: note.author,
          },
          starred: note.isFavorite,
          tags: (note.tags as any) || [],
          assignedTo: [],
          link: `/dashboard/workspace/${workspaceId}`,
        }))
      : [];

    const pomodoroInfo: WorkspaceRecentActivity[] = workspaceData
      ? workspaceData.pomodoroSessions.map((pomodoro) => ({
          id: pomodoro.id,
          title: "Pomodoro Session",
          emoji: "🍅",
          type: "pomodoro",
          updated: {
            at: pomodoro.completedAt,
            by: pomodoro.user,
          },
          starred: false,
          tags: [],
          assignedTo: [],
          link: `/dashboard/pomodoro`,
        }))
      : [];

    const groupInfo: WorkspaceRecentActivity[] = workspaceData
      ? workspaceData.groups.map((group) => ({
          id: group.id,
          title: group.name,
          emoji: "👥",
          type: "group",
          updated: {
            at: group.updatedAt,
            by: null,
          },
          starred: false,
          tags: [],
          assignedTo: [],
          link: `/dashboard/workspace/${workspaceId}/groups/${group.id}`,
        }))
      : [];

    const channelInfo: WorkspaceRecentActivity[] = workspaceData
      ? workspaceData.channels.map((channel) => ({
          id: channel.id,
          title: channel.name,
          emoji: channel.type === "TYPING_RACE" ? "⌨️" : channel.type === "VIDEO" ? "📹" : channel.type === "VOICE" ? "🔊" : "💬",
          type: "channel",
          updated: {
            at: channel.updatedAt,
            by: null,
          },
          starred: false,
          tags: [],
          assignedTo: [],
          link: `/dashboard/workspace/${workspaceId}/channel/${channel.id}`,
        }))
      : [];

    return NextResponse.json(
      sortMindMapsAndTasksDataByUpdatedAt({
        tasks: taskInfo,
        mindMaps: mindMapInfo,
        notes: noteInfo,
        pomodoros: pomodoroInfo,
        groups: groupInfo,
        channels: channelInfo,
        dsa: [],
      }),
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 405 });
  }
};
