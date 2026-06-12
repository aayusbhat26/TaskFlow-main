import { db } from "@/lib/db";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MediaChannelView } from "@/components/channels/MediaChannelView";

interface Props {
  params: {
    workspace_id: string;
    channelId: string;
  };
}

export default async function ChannelPage({ params: { workspace_id, channelId } }: Props) {
  const session = await getAuthSession();
  if (!session) redirect("/");

  // @ts-ignore
  const channel = await db.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) redirect(`/dashboard/workspace/${workspace_id}`);

  // Fetch workspace and user data for MediaChannelView
  const workspace = await db.workspace.findUnique({
    where: { id: workspace_id },
    include: {
      _count: { select: { subscribers: true } },
    }
  });

  if (!workspace) redirect("/");

  const currentUser = {
    id: session.user.id,
    name: session.user.name || '',
    email: session.user.email || '',
    image: session.user.image,
    username: session.user.username || '',
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Media Area */}
      <div className="flex-1 overflow-hidden">
        <MediaChannelView 
          channel={channel}
          workspace={workspace} 
          currentUser={currentUser} 
        />
      </div>
    </div>
  );
}
