import {
  CustomColors,
  ChatMessage,
  MessageReaction,
  MindMap,
  Notification,
  savedMindMaps,
  savedTask,
  Tag,
  Task,
  UserPermission,
  Workspace,
} from "@prisma/client";

// Define AdditionalResourceTypes if not imported from elsewhere
export type AdditionalResourceTypes = "image" | "video" | "document" | "audio";

export interface SubscriptionUser {
  userRole: UserPermission;
  user: {
    id: string;
    image?: string | null;
    username: string;
  };
}

export interface SettingsWorkspace extends Workspace {
  subscribers: SubscriptionUser[];
}

export interface ShortTask {
  id: string;
  emoji: string;
  title: string;
}

export interface ExtendedTask extends Task {
  tags: Tag[];
  taskDate?: {
    id: string;
    from: string | null;
    to: string | null;
  };
  savedTask?: savedTask[];
  creator: UserInfo;
  updatedBy: UserInfo;
}

export interface ShortMindMap {
  id: string;
  title: string;
}

export interface WorkspaceShortcuts extends Workspace {
  tasks: ShortTask[];
  mindMaps: ShortMindMap[];
}

export interface ExtendedMindMap extends MindMap {
  tags: Tag[];
  savedMindMaps?: savedMindMaps[];
  creator: UserInfo;
  updatedBy: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  image?: string | null;
  name?: string | null;
  surname?: string | null;
}

export interface AssignedToTaskUser {
  user: {
    id: string;
    image: string | null;
    username: string;
    assignedToTask: {
      userId: string;
    }[];
  };
}

export interface UsersAssignedToTaskInfo extends Workspace {
  subscribers: AssignedToTaskUser[];
}

export interface AssignedToMindMapUser {
  user: {
    id: string;
    image: string | null;
    username: string;
    assignedToMindMap: {
      userId: string;
    }[];
  };
}

export interface UsersAssignedToMindMapInfo extends Workspace {
  subscribers: AssignedToMindMapUser[];
}

export type AssignedItemType = "task" | "mindMap" | "note" | "pomodoro" | "dsa" | "group" | "channel";

export interface AssignedToMeDataItem {
  id: string;
  title: string;
  emoji: string;
  link: string;
  workspaceName: string;
  createdAt: Date;
  type: AssignedItemType;
  updated: {
    at: Date;
    by?: UserInfo | null;
  };
  workspaceId: string;
  starred: boolean;
}

export interface AssignedToMeTaskAndMindMaps {
  tasks: AssignedToMeDataItem[];
  mindMaps: AssignedToMeDataItem[];
  notes: AssignedToMeDataItem[];
  pomodoros: AssignedToMeDataItem[];
  dsa: AssignedToMeDataItem[];
  groups?: AssignedToMeDataItem[];
  channels?: AssignedToMeDataItem[];
}

export interface CalendarItem {
  title: string;
  taskDate: {
    id: string;
    from: Date | undefined;
    to: Date | undefined;
  } | null;
  workspaceId: string;
  workspaceName: string;
  workspaceColor: CustomColors;
  taskId: string;
}

export interface UserActiveItemList {
  id: string;
  username: string;
  image: string | null;
  userRole: UserPermission;
}

export interface HomePageImage {
  src: string;
  alt: string;
}

export interface UserNotification extends Notification {
  notifyCreator: {
    id: string;
    username: string;
    image: string | null;
  };
  workspace: {
    id: string;
    name: string;
  } | null;
}

export interface HomeRecentActivity extends AssignedToMeDataItem {
  starred: boolean;
}

export interface HomeRecentTasksAndMindMapsActivity
  extends AssignedToMeTaskAndMindMaps {}

export interface FilterUser {
  id: string;
  username: string;
  image: string | null;
}

export interface WorkspaceRecentActivityTagItem {
  id: string;
  name: string;
  color: CustomColors;
}

export interface WorkspaceRecentActivityAssignedToItem {
  user: {
    id: string;
    image: string | null;
    username: string;
  };
  id: string;
  userId: string;
  mindMapId?: string;
  taskId?: string;
}

export interface WorkspaceRecentActivity {
  id: string;
  title: string;
  emoji: string;
  type: AssignedItemType;
  updated: {
    at: Date;
    by?: UserInfo | null;
  };
  starred: boolean;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  tags: Tag[];
  assignedTo: WorkspaceRecentActivityAssignedToItem[];
  link: string;
}

export interface AssignedToMeTaskAndMindMapsWorkspaceRecentActivity {
  tasks: WorkspaceRecentActivity[];
  mindMaps: WorkspaceRecentActivity[];
  notes: WorkspaceRecentActivity[];
  pomodoros: WorkspaceRecentActivity[];
  dsa: WorkspaceRecentActivity[];
  groups?: WorkspaceRecentActivity[];
  channels?: WorkspaceRecentActivity[];
}

export interface ExtendedWorkspace extends Workspace {
  conversation: {
    id: string;
  };
}

export interface AdditionalResource {
  id: string;
  name: string;
  url: string;
  type: AdditionalResourceTypes;
  size?: number;
  originalSize?: number;
  compressionLevel?: number;
  duration?: number; // for videos in seconds
  thumbnail?: string; // for videos
  mimeType?: string;
}

export interface ExtendedMessage extends ChatMessage {
  additionalResources: AdditionalResource[];
  sender: {
    id: string;
    username: string;
    image?: string | null;
  };
  reactions?: MessageReaction[];
  replyTo?: ExtendedMessage;
}
