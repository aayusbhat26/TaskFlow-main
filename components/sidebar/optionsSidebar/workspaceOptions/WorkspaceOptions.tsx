"use client";

import { CalendarRange, Files, Map, PencilRuler, Workflow } from "lucide-react";
import { useTranslations } from "next-intl";
import { NewTask } from "./actions/NewTask";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceShortcuts } from "@/types/extended";
import { WorkspaceOption } from "./WorkspaceOption";
import { NewMindMap } from "./actions/NewMindMap";
import { UsersContainer } from "./usersList/UsersContainer";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { GroupsList } from "../groups/GroupsList";
import { ChannelsList } from "./channels/ChannelsList";

interface Props {
  workspaceId: string;
}

export const WorkspaceOptions = ({ workspaceId }: Props) => {
  const t = useTranslations("SIDEBAR.WORKSPACE_OPTIONS");
  const pathname = usePathname();

  const { data: workspaceShortcuts, isLoading } = useQuery({
    queryFn: async () => {
      const res = await fetch(
        `/api/workspace/get/workspace_shortcuts?workspaceId=${workspaceId}`
      );

      if (!res.ok) return null;

      const data = await res.json();
      return data as WorkspaceShortcuts;
    },
    queryKey: ["getWrokspaceShortcuts", workspaceId],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs sm:text-sm uppercase text-muted-foreground mb-2">
          {t("SHORTCUTS")}
        </p>
        {!isLoading && workspaceShortcuts && (
          <div className="flex flex-col gap-2">
            <WorkspaceOption
              workspaceId={workspaceId}
              href={`tasks/task`}
              fields={workspaceShortcuts.tasks}
              defaultName="Untitled"
            >
              <PencilRuler size={16} />
              {t("TASKS")}
            </WorkspaceOption>
            <WorkspaceOption
              workspaceId={workspaceId}
              href={`mind-maps/mind-map`}
              fields={workspaceShortcuts.mindMaps}
              defaultName={t("DEFAULT_NAME")}
            >
              <Workflow size={16} />
              {t("MIND_MAPS")}
            </WorkspaceOption>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs sm:text-sm uppercase text-muted-foreground mb-2">
          CHANNELS
        </p>
        <ChannelsList workspaceId={workspaceId} />
      </div>
      <div>
        <p className="text-xs sm:text-sm uppercase text-muted-foreground mb-2">
          {t("ACTIONS")}
        </p>
        <div className="flex flex-col gap-2 w-full mt-2">
          <NewTask workspaceId={workspaceId} />
          <NewMindMap workspaceId={workspaceId} />
        </div>
      </div>
      <GroupsList workspaceId={workspaceId} />
      <UsersContainer />
    </div>
  );
};
