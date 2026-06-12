import { db } from "@/lib/db";
import { sortMindMapsAndTasksDataByUpdatedAt } from "@/lib/sortMindMapsAndTasksDataByUpdatedAt";
import { HomeRecentActivity } from "@/types/extended";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const take = url.searchParams.get("take");
  const page = url.searchParams.get("page");

  if (!userId || !take || !page)
    return NextResponse.json("ERRORS.WRONG_DATA", { status: 404 });

  const takeValue = parseInt(take ? take : "");
  const pageValue = parseInt(page ? page : "");
  const skipValue = takeValue * (pageValue - 1);

  try {
    const tasks = await db.task.findMany({
      where: {
        workspace: {
          subscribers: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
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
        workspace: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: skipValue,
      take: takeValue,
    });

    const mindMaps = await db.mindMap.findMany({
      where: {
        workspace: {
          subscribers: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
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
        workspace: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: skipValue,
      take: takeValue,
    });

    const tasksData: HomeRecentActivity[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      emoji: task.emoji,
      link: `/dashboard/workspace/${task.workspaceId}/tasks/task/${task.id}`,
      workspaceName: task.workspace.name,
      createdAt: new Date(task.createdAt),
      type: "task",
      updated: {
        at: new Date(task.updatedAt),
        by: task.updatedBy,
      },
      workspaceId: task.workspaceId,
      starred: task.savedTask.length > 0,
    }));

    const mindMapsData: HomeRecentActivity[] = mindMaps.map((mindMap) => ({
      id: mindMap.id,
      title: mindMap.title,
      emoji: mindMap.emoji,
      link: `/dashboard/workspace/${mindMap.workspaceId}/mind-maps/mind-map/${mindMap.id}`,
      workspaceName: mindMap.workspace.name,
      createdAt: new Date(mindMap.createdAt),
      type: "mindMap",
      updated: {
        at: new Date(mindMap.updatedAt),
        by: mindMap.updatedBy,
      },
      workspaceId: mindMap.workspaceId,
      starred: mindMap.savedMindMaps.length > 0,
    }));

    const notes = await db.note.findMany({
      where: {
        OR: [
          { authorId: userId },
          {
            workspace: {
              subscribers: {
                some: { userId },
              },
            },
          },
        ],
      },
      include: {
        author: {
          select: {
            username: true,
            name: true,
            id: true,
            image: true,
            surname: true,
          },
        },
        workspace: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: skipValue,
      take: takeValue,
    });

    const notesData: HomeRecentActivity[] = notes.map((note) => ({
      id: note.id,
      title: note.title || "Untitled",
      emoji: note.icon || "📝",
      link: note.workspaceId ? `/dashboard/workspace/${note.workspaceId}` : `/dashboard/notes`,
      workspaceName: note.workspace?.name || "Personal Notes",
      createdAt: new Date(note.createdAt),
      type: "note",
      updated: {
        at: new Date(note.updatedAt),
        by: note.author,
      },
      workspaceId: note.workspaceId || "personal",
      starred: note.isFavorite,
    }));

    const pomodoros = await db.pomodoroSession.findMany({
      where: {
        userId,
      },
      include: {
        user: {
          select: {
            username: true,
            name: true,
            id: true,
            image: true,
            surname: true,
          },
        },
        workspace: true,
      },
      orderBy: {
        completedAt: "desc",
      },
      skip: skipValue,
      take: takeValue,
    });

    const pomodorosData: HomeRecentActivity[] = pomodoros.map((pomodoro) => ({
      id: pomodoro.id,
      title: "Pomodoro Session",
      emoji: "🍅",
      link: `/dashboard/pomodoro`,
      workspaceName: pomodoro.workspace?.name || "Personal Timer",
      createdAt: new Date(pomodoro.completedAt),
      type: "pomodoro",
      updated: {
        at: new Date(pomodoro.completedAt),
        by: pomodoro.user,
      },
      workspaceId: pomodoro.workspaceId || "personal",
      starred: false,
    }));

    const dsaProgress = await db.dSAProgress.findMany({
      where: {
        userId,
      },
      include: {
        question: true,
        user: {
          select: {
            username: true,
            name: true,
            id: true,
            image: true,
            surname: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: skipValue,
      take: takeValue,
    });

    const dsaData: HomeRecentActivity[] = dsaProgress.map((dsa) => ({
      id: dsa.id,
      title: dsa.question.title,
      emoji: "💻",
      link: `/dashboard/dsa/${dsa.questionId}`,
      workspaceName: "DSA Tracker",
      createdAt: new Date(dsa.createdAt),
      type: "dsa",
      updated: {
        at: new Date(dsa.updatedAt),
        by: dsa.user,
      },
      workspaceId: "dsa",
      starred: false,
    }));

    const groups = await db.group.findMany({
      where: {
        workspace: {
          subscribers: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        workspace: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: skipValue,
      take: takeValue,
    });

    const groupsData: HomeRecentActivity[] = groups.map((group) => ({
      id: group.id,
      title: group.name,
      emoji: "👥",
      link: `/dashboard/workspace/${group.workspaceId}/groups/${group.id}`,
      workspaceName: group.workspace.name,
      createdAt: new Date(group.createdAt),
      type: "group",
      updated: {
        at: new Date(group.updatedAt),
        by: null,
      },
      workspaceId: group.workspaceId,
      starred: false,
    }));

    return NextResponse.json(
      sortMindMapsAndTasksDataByUpdatedAt({
        tasks: tasksData,
        mindMaps: mindMapsData,
        notes: notesData,
        pomodoros: pomodorosData,
        dsa: dsaData,
        groups: groupsData,
      }),
      { status: 200 }
    );
  } catch (_) {
    return NextResponse.json("ERRORS.DB_ERROR", { status: 404 });
  }
};
