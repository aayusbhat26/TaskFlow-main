import { db } from "@/lib/db";
import {
  ExtendedMindMap,
  ExtendedTask,
  HomeRecentActivity,
  SettingsWorkspace,
} from "@/types/extended";
import { PomodoroSettings, UserPermission, Workspace } from "@prisma/client";
import { ACTIVITY_PER_PAGE } from "./constants";

export const getWorkspaceData = async (
  workspace_id: string,
  userId: string
) => {
  const workspace = await db.workspace.findUnique({
    where: {
      id: workspace_id,
      subscribers: {
        some: {
          userId,
        },
      },
    },
    include: {
      subscribers: {
        include: {
          user: true,
        },
      },
    },
  });

  return workspace;
};

export const getWorkspaceWithChatData = async (
  workspace_id: string,
  userId: string
) => {
  const workspace = await db.workspace.findUnique({
    where: {
      id: workspace_id,
      subscribers: {
        some: {
          userId,
        },
      },
    },
    include: {
      chatMessages: {
        include: {
          author: true,
          workspace: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 50,
      },
      subscribers: {
        include: {
          user: true,
        },
      },
    },
  });

  return workspace;
};

export const getUserWorkspaceRoleData = async (
  workspace_id: string,
  userId: string
) => {
  const subscription = await db.subscription.findFirst({
    where: {
      userId,
      workspaceId: workspace_id,
    },
    select: {
      userRole: true,
    },
  });

  return subscription?.userRole ?? null;
};

export const getMindMapData = async (mind_map_id: string, userId: string) => {
  const mindMap = await db.mindMap.findUnique({
    where: {
      id: mind_map_id,
      workspace: {
        subscribers: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      tags: true,
      savedMindMaps: true,
      creator: true,
      updatedBy: true,
      workspace: {
        include: {
          subscribers: true,
        },
      },
    },
  });

  return mindMap;
};

export const getTaskData = async (task_id: string, userId: string) => {
  const task = await db.task.findUnique({
    where: {
      id: task_id,
      workspace: {
        subscribers: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      tags: true,
      savedTask: true,
      creator: true,
      updatedBy: true,
      taskDate: true,
      workspace: {
        include: {
          subscribers: true,
        },
      },
    },
  });

  return task;
};
