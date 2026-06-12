"use client";

import { useQuery } from "@tanstack/react-query";
import { Hash, Volume2, Video, Mic, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Channel, ChannelCategory, ChannelType } from "@prisma/client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/components/ui/button";

interface Props {
  workspaceId: string;
}

type CategoryWithChannels = ChannelCategory & { channels: Channel[] };

interface ChannelsData {
  categories: CategoryWithChannels[];
  uncategorizedChannels: Channel[];
}

import { NewCategoryModal } from "./NewCategoryModal";
import { NewChannelModal } from "./NewChannelModal";

export const ChannelsList = ({ workspaceId }: Props) => {
  const t = useTranslations("SIDEBAR.WORKSPACE_OPTIONS");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const { data: channelsData, isLoading } = useQuery<ChannelsData>({
    queryFn: async () => {
      const res = await fetch(`/api/channels/get?workspaceId=${workspaceId}`);
      if (!res.ok) return null;
      return res.json();
    },
    queryKey: ["getWorkspaceChannels", workspaceId],
  });

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderIcon = (type: ChannelType) => {
    switch (type) {
      case "TEXT": return <Hash size={16} className="text-muted-foreground" />;
      case "VOICE": return <Volume2 size={16} className="text-muted-foreground" />;
      case "VIDEO": return <Video size={16} className="text-muted-foreground" />;
      case "STAGE": return <Mic size={16} className="text-muted-foreground" />;
      default: return <Hash size={16} className="text-muted-foreground" />;
    }
  };

  if (isLoading) return <div className="h-20 flex items-center justify-center"><div className="animate-pulse w-full h-4 bg-muted rounded"></div></div>;
  if (!channelsData) return null;

  return (
    <div className="flex flex-col gap-1 mt-2">
      {/* Uncategorized Channels */}
      {channelsData.uncategorizedChannels.map(channel => (
        <Link
          key={channel.id}
          href={`/dashboard/workspace/${workspaceId}/channel/${channel.id}`}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-start h-8 text-muted-foreground hover:text-foreground font-semibold px-2"
          )}
        >
          {renderIcon(channel.type)}
          <span className="ml-2 truncate">{channel.name}</span>
        </Link>
      ))}

      {/* Categories */}
      {channelsData.categories.map(category => {
        const isExpanded = expandedCategories[category.id] !== false; // Default expanded
        
        return (
          <div key={category.id} className="mt-2 flex flex-col gap-0.5">
            <div 
              className="flex items-center justify-between group cursor-pointer px-1 hover:text-foreground text-muted-foreground"
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center gap-1">
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <p className="text-xs font-bold uppercase tracking-wider">
                  {category.name}
                </p>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <NewChannelModal 
                  workspaceId={workspaceId} 
                  categoryId={category.id} 
                  categories={channelsData.categories.map(c => ({ id: c.id, name: c.name }))}
                />
              </div>
            </div>

            {isExpanded && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {category.channels.map(channel => (
                  <Link
                    key={channel.id}
                    href={`/dashboard/workspace/${workspaceId}/channel/${channel.id}`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "w-full justify-start h-8 text-muted-foreground hover:text-foreground hover:bg-muted font-semibold px-2"
                    )}
                  >
                    {renderIcon(channel.type)}
                    <span className="ml-2 truncate">{channel.name}</span>
                  </Link>
                ))}
                {category.channels.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 italic px-6 py-1">No channels</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="mt-2 flex flex-col gap-1">
        <NewChannelModal 
          workspaceId={workspaceId} 
          categories={channelsData.categories.map(c => ({ id: c.id, name: c.name }))} 
        >
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground hover:text-foreground">
            <Plus className="mr-2 h-4 w-4" /> Create Channel
          </Button>
        </NewChannelModal>
        <NewCategoryModal workspaceId={workspaceId}>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground hover:text-foreground">
            <Plus className="mr-2 h-4 w-4" /> Create Category
          </Button>
        </NewCategoryModal>
      </div>
    </div>
  );
};
