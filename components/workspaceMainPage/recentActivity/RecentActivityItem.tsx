"use client";

import { ReadOnlyEmoji } from "@/components/common/ReadOnlyEmoji";
import { StarSvg } from "@/components/common/StarSvg";
import { UserHoverInfo } from "@/components/common/UserHoverInfoCard";
import { Card, CardContent } from "@/components/ui/card";
import { useTruncateText } from "@/hooks/useTruncateText";
import { WorkspaceRecentActivity } from "@/types/extended";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TagItem } from "./TagItem";
import { AssignedToTaskUser } from "./AssignedToTaskUser";
import { Flag, Workflow, PencilRuler, Hash, Users, StickyNote, Timer, Code } from "lucide-react";

interface Props {
  activity: WorkspaceRecentActivity;
  viewMode?: "list" | "grid";
}

export const RecentActivityItem = ({
  activity: { tags, title, emoji, starred, type, updated, assignedTo, link, priority },
  viewMode = "list",
}: Props) => {
  const router = useRouter();

  const truncatedTitle = useTruncateText(title, 40);

  const c = useTranslations("COMMON");
  const format = useFormatter();
  const dateTime = new Date(updated.at);
  const now = new Date();

  const itemTypeSentence = (() => {
    switch (type) {
      case "mindMap":
        return c("EDITED_ITEM_SENTENCE.MIND_MAP");
      case "task":
        return c("EDITED_ITEM_SENTENCE.TASK");
      case "note":
        return c("EDITED_ITEM_SENTENCE.NOTE");
      case "pomodoro":
        return c("EDITED_ITEM_SENTENCE.POMODORO");
      case "dsa":
        return c("EDITED_ITEM_SENTENCE.DSA");
      case "group":
        return "Updated group";
      case "channel":
        return "Updated channel";
      default:
        return c("EDITED_ITEM_SENTENCE.TASK");
    }
  })();
  return (
    <Link href={link}>
      <Card className="bg-background border-none hover:bg-accent transition-colors duration-200 p-2 h-full">
        <CardContent className={`flex w-full justify-between p-2 sm:p-2 pt-0 ${viewMode === "grid" ? "flex-col items-start gap-2" : "sm:items-center"}`}>
          <div className={`flex sm:gap-4 gap-2 w-full ${viewMode === "grid" ? "flex-col items-start" : "flex-row"}`}>
            <div className="relative shrink-0">
              <ReadOnlyEmoji
                className={`shrink-0 ${viewMode === "grid" ? "h-10 w-10 sm:h-12 sm:w-12" : "sm:h-16 sm:w-16 h-12 w-12"}`}
                selectedEmoji={emoji}
              />
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-sm border" title={type}>
                {type === "mindMap" ? <Workflow className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> : 
                 type === "task" ? <PencilRuler className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> :
                 type === "channel" ? <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> :
                 type === "group" ? <Users className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> :
                 type === "note" ? <StickyNote className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> :
                 type === "pomodoro" ? <Timer className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> :
                 type === "dsa" ? <Code className="w-3 h-3 sm:w-4 sm:h-4 text-primary" /> :
                 <PencilRuler className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />}
              </div>
            </div>
            <div className="w-full">
              <div className="flex items-center">
                <h2 className="text-base sm:text-lg font-semibold line-clamp-1">
                  {!title && type === "mindMap" && c("DEFAULT_NAME.MIND_MAP")}
                  {!title && type === "task" && c("DEFAULT_NAME.TASK")}
                  {title && truncatedTitle}
                </h2>
                {starred && <StarSvg className="ml-2 w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
                {priority && priority !== "LOW" && priority !== "MEDIUM" && (
                  <div title={`Priority: ${priority}`} className="ml-2 bg-muted/50 rounded p-1 flex items-center justify-center shrink-0">
                    <Flag className={`w-3 h-3 sm:w-4 sm:h-4 ${priority === "URGENT" ? "text-red-500" : "text-orange-500"}`} />
                  </div>
                )}
              </div>
              {updated.by ? (
                <div className="flex flex-col md:flex-row md:items-center md:gap-1">
                  <p className="text-muted-foreground">{itemTypeSentence}</p>{" "}
                  {format.relativeTime(dateTime, now)}{" "}
                  {c("EDITED_ITEM_SENTENCE.BY")}
                  <div className="flex items-center gap-1">
                    <UserHoverInfo className="px-0" user={updated.by} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center md:gap-1">
                  <p className="text-muted-foreground">{itemTypeSentence}</p>{" "}
                  <span className="text-muted-foreground">{format.relativeTime(dateTime, now)}</span>
                </div>
              )}
              <div className="flex items-center flex-wrap gap-1 mt-2">
                {assignedTo.map((user) => (
                  <AssignedToTaskUser key={user.id} userInfo={user} />
                ))}
                {tags.map((tag) => (
                  <TagItem key={tag.id} tag={tag} />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
