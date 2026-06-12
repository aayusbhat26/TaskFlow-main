"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, MessageSquare, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface MentionData {
  id: string;
  messageId: string;
  read: boolean;
  createdAt: string;
  message: {
    content: string;
    author: {
      name: string;
      username: string;
      image: string | null;
    };
    workspaceId: string;
    groupId: string | null;
    workspace: { name: string };
    group?: { name: string } | null;
  };
}

export function UnreadMentionsWidget() {
  const t = useTranslations("DASHBOARD");
  const queryClient = useQueryClient();

  const { data: mentions, isLoading } = useQuery<MentionData[]>({
    queryKey: ["unreadMentions"],
    queryFn: async () => {
      const res = await fetch("/api/mentions?unreadOnly=true");
      return res.json();
    },
    refetchInterval: 10000, // Refetch every 10s
  });

  const markAsRead = useMutation({
    mutationFn: async (mentionId: string) => {
      await fetch("/api/mentions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentionId, read: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unreadMentions"] });
    },
  });

  if (isLoading || !mentions || !Array.isArray(mentions)) {
    return (
      <Card className="bg-background shadow-sm h-full flex flex-col border-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Unread Mentions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="animate-pulse flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-muted"></div>
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background shadow-sm h-full flex flex-col border-none">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Unread Mentions
          {mentions.length > 0 && (
            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
              {mentions.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {mentions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">You're all caught up!</p>
            <p className="text-xs opacity-75">No new mentions</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {mentions.map((mention) => {
              const link = mention.message.groupId 
                ? `/dashboard/workspace/${mention.message.workspaceId}/groups/${mention.message.groupId}`
                : `/dashboard/workspace/${mention.message.workspaceId}`;

              return (
                <div key={mention.id} className="group flex items-start justify-between p-4 border-b border-border hover:bg-muted/30 transition-colors">
                  <Link 
                    href={link} 
                    className="flex-1 min-w-0 pr-4"
                    onClick={() => markAsRead.mutate(mention.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">
                        {mention.message.author.name || mention.message.author.username}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        in {mention.message.group?.name || mention.message.workspace.name}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {formatDistanceToNow(new Date(mention.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">
                      {mention.message.content}
                    </p>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      markAsRead.mutate(mention.id);
                    }}
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
