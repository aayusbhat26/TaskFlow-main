import { AddTaskShortcut } from "@/components/addTaskShortCut/AddTaskShortcut";
import { DashboardHeader } from "@/components/header/DashboardHeader";
import { InviteUsers } from "@/components/inviteUsers/InviteUsers";
import { LeaveWorkspace } from "@/components/workspaceMainPage/shortcuts/leaveWorkspace/LeaveWorkspace";
import { PermissionIndicator } from "@/components/workspaceMainPage/shortcuts/permissionIndicator/Permissionindicator";
import { FilterContainer } from "@/components/workspaceMainPage/filter/FilterContainer";
import { ShortcutContainer } from "@/components/workspaceMainPage/shortcuts/ShortcutContainer";
import {
  getUserWorkspaceRoleData,
  getWorkspaceData,
} from "@/lib/server-actions";
import { checkIfUserCompletedOnboarding } from "@/lib/checkIfUserCompletedOnboarding";
import { FilterByUsersAndTagsInWorkspaceProvider } from "@/context/FilterByUsersAndTagsInWorkspace";
import { RecentActivityContainer } from "@/components/workspaceMainPage/recentActivity/RecentActivityContainer";
import { notFound } from "next/navigation";

interface Params {
  params: {
    workspace_id: string;
  };
}

const Workspace = async ({ params: { workspace_id } }: Params) => {
  const session = await checkIfUserCompletedOnboarding(
    `/dashboard/workspace/${workspace_id}`
  );

  const [workspace, userRole] = await Promise.all([
    getWorkspaceData(workspace_id, session.user.id),
    getUserWorkspaceRoleData(workspace_id, session.user.id),
  ]);

  if (!workspace || !userRole) notFound();

  return (
    <FilterByUsersAndTagsInWorkspaceProvider>
      <DashboardHeader
        addManualRoutes={[
          {
            name: "DASHBOARD",
            href: "/dashboard",
            useTranslate: true,
          },
          {
            name: workspace.name,
            href: `/dashboard/workspace/${workspace_id}`,
          },
        ]}
      >
        {(userRole === "ADMIN" || userRole === "OWNER") && (
          <InviteUsers workspace={workspace} />
        )}
        {userRole !== "OWNER" && <LeaveWorkspace workspace={workspace} />}
        <AddTaskShortcut userId={session.user.id} />
      </DashboardHeader>
      <main className="flex flex-col gap-2 w-full px-4 sm:px-6">
        <ShortcutContainer workspace={workspace} userRole={userRole} />
        <FilterContainer sessionUserId={session.user.id} />
        <RecentActivityContainer
          userId={session.user.id}
          workspaceId={workspace.id}
        />
      </main>
    </FilterByUsersAndTagsInWorkspaceProvider>
  );
};

export default Workspace;
