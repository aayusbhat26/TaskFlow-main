import { TypingTest } from "@/components/gaming/TypingTest";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

interface Props {
  params: {
    workspace_id: string;
    locale: string;
  };
}

export default async function TypingTestPage({ params: { workspace_id } }: Props) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const currentUser = {
    id: session.user.id,
    name: session.user.name || "User",
    username: session.user.username || "user",
    image: session.user.image,
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 lg:p-12 bg-background overflow-y-auto">
      <TypingTest workspaceId={workspace_id} currentUser={currentUser} />
    </div>
  );
}
