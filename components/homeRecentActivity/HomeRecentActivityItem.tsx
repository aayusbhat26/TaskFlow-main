import { AssignedToMeDataItem, HomeRecentActivity } from "@/types/extended";
import { Card, CardContent } from "../ui/card";
import { ReadOnlyEmoji } from "../common/ReadOnlyEmoji";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo } from "react";
import { UserHoverInfo } from "../common/UserHoverInfoCard";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { Star, Workflow, PencilRuler } from "lucide-react";
import { StarSvg } from "../common/StarSvg";

interface Props {
  activityItem: HomeRecentActivity;
}

export const HomeRecentActivityItem = ({
  activityItem: {
    emoji,
    link,
    title,
    type,
    updated,
    workspaceId,
    workspaceName,
    starred,
  },
}: Props) => {
  const format = useFormatter();
  const dateTime = new Date(updated.at);
  const now = new Date();

  const t = useTranslations("STARRED");
  const c = useTranslations("COMMON");

  const itemTypeSentence = useMemo(() => {
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
        return "Updated members";
      default:
        return c("EDITED_ITEM_SENTENCE.TASK");
    }
  }, [type, c]);
  return (
    <Link href={link}>
      <Card className="bg-background border-none hover:bg-accent transition-colors duration-200 p-2">
        <CardContent className="flex w-full justify-between sm:items-center p-2 sm:p-2 pt-0">
          <div className="flex flex-row sm:gap-3 gap-2 w-full">
            <div className="relative shrink-0">
              <ReadOnlyEmoji
                className="sm:h-10 sm:w-10 h-8 w-8 shrink-0"
                selectedEmoji={emoji}
              />
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-sm border" title={type === "mindMap" ? "Mind Map" : "Task"}>
                {type === "mindMap" ? <Workflow className="w-3 h-3 text-primary" /> : <PencilRuler className="w-3 h-3 text-primary" />}
              </div>
            </div>
            <div className="w-full">
              <div className="flex items-center">
                <h2 className="text-base sm:text-lg font-semibold">
                  {!title && type === "mindMap" && t("DEFAULT_NAME.MIND_MAP")}
                  {!title && type === "task" && t("DEFAULT_NAME.TASK")}
                  {title && title}
                </h2>
                {starred && <StarSvg className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />}
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:gap-1 text-sm">
                <p className="text-muted-foreground">{itemTypeSentence}</p>{" "}
                <span className="text-muted-foreground">{format.relativeTime(dateTime, now)}</span>{" "}
                
                {updated.by && (
                  <>
                    <span className="text-muted-foreground">{c("EDITED_ITEM_SENTENCE.BY")}</span>
                    <UserHoverInfo className="px-0" user={updated.by} />
                  </>
                )}

                <div className="flex items-center gap-1">
                  <p className="text-muted-foreground">
                    {c("EDITED_ITEM_SENTENCE.IN")}{" "}
                    <Link
                      className={cn(
                        `${buttonVariants({
                          variant: "link",
                        })} px-0 text-muted-foreground`
                      )}
                      href={
                        workspaceId === "personal" 
                          ? "/dashboard/notes"
                          : workspaceId === "dsa" 
                            ? "/dashboard/dsa"
                            : `/dashboard/workspace/${workspaceId}`
                      }
                    >
                      {workspaceName}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
