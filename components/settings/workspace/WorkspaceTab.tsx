import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsWorkspace } from "@/types/extended";
import { Layers, Users2 } from "lucide-react";
import { EditWorkspaceCard } from "./overview/Edit/EditWorkspaceCard";
import { Separator } from "@/components/ui/separator";
import { DeleteWorkspace } from "./overview/DeleteWorkspace";
import { MembersCard } from "./members/MembersCard";

interface Props {
  workspace: SettingsWorkspace;
  workspaceId: string;
  refetchWorkspaces?: () => void;
}

export const WorkspaceTab = ({ workspace, workspaceId, refetchWorkspaces }: Props) => {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-6">
        <TabsTrigger value="overview" className="mr-2 flex items-center gap-2">
          <Layers size={18} />
          Overview
        </TabsTrigger>
        <TabsTrigger value="members" className="mr-2 flex items-center gap-2">
          <Users2 size={18} />
          Members
        </TabsTrigger>
      </TabsList>
      <TabsContent tabIndex={1} value="overview">
        <EditWorkspaceCard workspace={workspace} />
        <div className="py-4 smLpy-6">
          <Separator />
        </div>
        <DeleteWorkspace workspace={workspace} refetchWorkspaces={typeof refetchWorkspaces === 'function' ? refetchWorkspaces : undefined} />
      </TabsContent>
      <TabsContent value="members">
        <MembersCard workspace={workspace} workspaceId={workspaceId} />
      </TabsContent>
    </Tabs>
  );
};
