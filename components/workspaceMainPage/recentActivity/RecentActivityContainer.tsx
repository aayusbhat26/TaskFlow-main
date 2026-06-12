"use client";

import { FilterUser, WorkspaceRecentActivity } from "@/types/extended";
import { useQuery } from "@tanstack/react-query";
import { RecentActivityItem } from "./RecentActivityItem";
import { Tag } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { useFilterByUsersAndTagsInWorkspace } from "@/context/FilterByUsersAndTagsInWorkspace";
import { ClientError } from "@/components/error/ClientError";
import { LoadingState } from "@/components/ui/loadingState";
import { NoFilteredData } from "./NoFilteredData";
import { NoData } from "./NoData";
import { useTranslations } from "next-intl";
import { List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  userId: string;
  workspaceId: string;
}

function applyFilters(
  data: WorkspaceRecentActivity[],
  selectedTags: Tag[],
  selectedUsers: FilterUser[]
): WorkspaceRecentActivity[] {
  return data.filter((activity) => {
    const tagsMatch = selectedTags.every((tag) =>
      activity.tags.some((activityTag) => activityTag.id === tag.id)
    );

    const usersMatch = selectedUsers.every((user) =>
      activity.assignedTo.some((assignedUser) => assignedUser.id === user.id)
    );

    return tagsMatch && usersMatch;
  });
}

export const RecentActivityContainer = ({ userId, workspaceId }: Props) => {
  const t = useTranslations("WORKSPACE_MAIN_PAGE.RECENT_ACTIVITY");
  const {
    data: recentActivity,
    isError,
    isLoading,
  } = useQuery<WorkspaceRecentActivity[]>({
    queryFn: async () => {
      const res = await fetch(
        `/api/workspace/get/workspace_home_page?userId=${userId}&workspaceId=${workspaceId}`
      );

      if (!res.ok) {
        const error = (await res.json()) as string;
        throw new Error(error);
      }

      const response = await res.json();

      return response as WorkspaceRecentActivity[];
    },
    queryKey: ["getWorkspaceRecentActivity", workspaceId],
  });

  const [filteredRecentActivity, setFilteredRecentActivity] = useState<
    WorkspaceRecentActivity[]
  >([]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const { filterAssignedUsers, filterTags } =
    useFilterByUsersAndTagsInWorkspace();

  useEffect(() => {
    if (!recentActivity) return;

    const filteredActivity: WorkspaceRecentActivity[] = [];
    const filterUserIds = filterAssignedUsers.map((user) => user.id);
    const filterTagIds = filterTags.map((tag) => tag.id);

    recentActivity.forEach((activity) => {
      const hasMatchingUsers =
        filterUserIds.length === 0 ||
        (filterUserIds.length > 0 &&
          activity.assignedTo.some((assignedToItem) =>
            filterUserIds.includes(assignedToItem.userId)
          ));

      const hasMatchingTags =
        filterTagIds.length === 0 ||
        (filterTagIds.length > 0 &&
          activity.tags.some((tag) => filterTagIds.includes(tag.id)));

      if (hasMatchingTags && hasMatchingUsers) {
        filteredActivity.push(activity);
      }
    });

    setFilteredRecentActivity(filteredActivity);
  }, [recentActivity, filterAssignedUsers, filterTags]);

  const activityItems = useMemo(() => {
    return filterAssignedUsers.length !== 0 || filterTags.length !== 0
      ? filteredRecentActivity
      : recentActivity;
  }, [recentActivity, filterAssignedUsers, filterTags, filteredRecentActivity]);

  if (isError) {
    return <ClientError message={t("ERROR")} />;
  } else {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between w-full">
          <CardTitle className="text-xl sm:text-2xl font-bold">{t("TITLE")}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8"
              title="List View"
            >
              <List size={16} />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8"
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full flex flex-col gap-2">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="animate-pulse bg-accent/20 rounded-full w-10 h-10" />
                    <div className="flex-1">
                      <div className="animate-pulse bg-accent/20 rounded h-4 w-48 mb-1" />
                      <div className="animate-pulse bg-accent/20 rounded h-3 w-32" />
                    </div>
                    <div className="flex gap-2">
                      <div className="animate-pulse bg-accent/20 rounded-full h-6 w-16" />
                      <div className="animate-pulse bg-accent/20 rounded-full h-6 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              activityItems && activityItems.length > 0 ? (
                <>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full" : "w-full flex flex-col gap-2"}>
                    {activityItems.slice(0, isExpanded ? undefined : 5).map((activity) => (
                      <RecentActivityItem key={activity.id} activity={activity} viewMode={viewMode} />
                    ))}
                  </div>
                  {activityItems.length > 5 && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => setIsExpanded(!isExpanded)}
                    >
                      {isExpanded ? "View Less" : "View More"}
                    </Button>
                  )}
                </>
              ) : (
                <NoFilteredData />
              )
            ) : (
              <NoData />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
};
