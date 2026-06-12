"use client";
import { CustomColors, Tag } from "@prisma/client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { taskSchema, TaskSchema } from "@/schema/taskSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";

import TextareaAutosize from "react-textarea-autosize";

import { DateRange } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Emoji } from "@/components/tasks/editable/container/Emoji";
import { TaskCalendar } from "@/components/tasks/editable/container/TaskCalendar";

import { TagSelector } from "../../../common/tag/TagSelector";
import { LinkTag } from "../tag/LinkTag";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";
import { useAutosaveIndicator } from "@/context/AutosaveIndicator";
import axios from "axios";
import { changeCodeToEmoji } from "@/lib/changeCodeToEmoji";
import { useTags } from "@/hooks/useTags";
import dynamic from "next/dynamic";
import { LoadingScreen } from "@/components/common/LoadingScreen";
import { useSession } from "next-auth/react";
import { Sparkles, Timer, Lock, Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const EditorTasks = dynamic(
  () => import("../editor/Editor").then((mod) => mod.EditorTasks),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
);

interface Props {
  workspaceId: string;
  initialActiveTags: Tag[];
  taskId: string;
  title?: string;
  content?: JSON;
  emoji?: string;
  from?: Date;
  to?: Date;
}

export const TaskContainer = ({
  workspaceId,
  initialActiveTags,
  taskId,
  title,
  content,
  emoji,
  from,
  to,
}: Props) => {
  const [isMounted, setIsMounted] = useState(false);
  const _titleRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations("TASK");
  const [taskDate] = useState({ from, to });
  
  const { data: session } = useSession();
  const router = useRouter();
  const isPro = session?.user?.plan === "PRO" || session?.user?.plan === "BUSINESS";

  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  const handleProFeatureClick = (action: () => void) => {
    if (!isPro) {
      router.push("/upgrade");
    } else {
      action();
    }
  };

  const { status, onSetStatus } = useAutosaveIndicator();

  const form = useForm<TaskSchema>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      icon: emoji,
      title: title ? title : "",
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { ref: titleRef, ...rest } = form.register("title");

  const onFormSelectHandler = (emoji: string) => {
    form.setValue("icon", emoji);
  };

  const onUpdateFormHandler = (date: DateRange | undefined) => {
    form.setValue("date", date);
  };

  const { mutate: updateTaskTitle, isPending } = useMutation({
    mutationFn: async (title: string) => {
      await axios.post("/api/task/update/title", {
        workspaceId,
        title,
        taskId,
      });
    },
    onSuccess: () => {
      onSetStatus("saved");
    },
    onError: () => {
      onSetStatus("unsaved");
    },
  });

  const { mutate: updateTaskActiveTags } = useMutation({
    mutationFn: async (tagIds: string[]) => {
      await axios.post("/api/task/update/active_tags", {
        workspaceId,
        tagsIds: tagIds,
        taskId,
      });
    },
    onSuccess: () => {
      onSetStatus("saved");
    },
    onError: () => {
      onSetStatus("unsaved");
    },
  });

  const debouncedTitle = useDebouncedCallback(
    useCallback((value: string) => {
      onSetStatus("pending");
      updateTaskTitle(value);
    }, []),
    500
  );

  const debouncedCurrentActiveTags = useDebouncedCallback(() => {
    onSetStatus("pending");
    const tagsIds = currentActiveTags.map((tag) => tag.id);
    updateTaskActiveTags(tagsIds);
  }, 2000);

  const onSubmit = (data: TaskSchema) => {
    console.log(data);
  };

  const {
    currentActiveTags,
    tags,
    isError,
    isLoadingTags,
    onDeleteActiveTagHandler,
    onSelectActiveTagHandler,
    onUpdateActiveTagHandler,
  } = useTags(
    workspaceId,
    isMounted,
    initialActiveTags,
    debouncedCurrentActiveTags
  );

  return (
    <Card>
      <form
        id="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <CardContent className="py-4 sm:py-6 flex flex-col gap-10">
          <div className="w-full flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
            <Emoji
              onFormSelect={onFormSelectHandler}
              emoji={form.getValues("icon")}
              taskId={taskId}
              workspaceId={workspaceId}
            />
            <div className="w-full flex flex-col gap-2">
              <TextareaAutosize
                {...rest}
                ref={(e) => {
                  titleRef(e);
                  //@ts-ignore
                  _titleRef.current = e;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                onChange={(e) => {
                  if (status !== "unsaved") onSetStatus("unsaved");
                  debouncedTitle(e.target.value);
                }}
                onBlur={() => {
                  debouncedTitle.flush();
                }}
                placeholder={t("HEADER.PLACEHOLDER")}
                className="w-full resize-none appearance-none overflow-hidden bg-transparent placeholder:text-muted-foreground text-2xl font-semibold focus:outline-none"
              />
              <div className="w-full gap-1 flex flex-wrap flex-row">
                <TaskCalendar
                  onUpdateForm={onUpdateFormHandler}
                  workspaceId={workspaceId}
                  taskId={taskId}
                  from={taskDate.from}
                  to={taskDate.to}
                />
                <TagSelector
                  isError={isError}
                  isLoading={isLoadingTags}
                  tags={tags}
                  currentActiveTags={currentActiveTags}
                  onSelectActiveTag={onSelectActiveTagHandler}
                  workspaceId={workspaceId}
                  onUpdateActiveTags={onUpdateActiveTagHandler}
                  onDeleteActiveTag={onDeleteActiveTagHandler}
                />

                {/* Premium Feature: Advanced Priority */}
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className={`h-9 px-3 flex items-center gap-2 ${!isPro ? "bg-muted/50 border-dashed" : "hover:bg-primary/10"}`}
                  onClick={() => handleProFeatureClick(() => {
                    const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
                    const nextIndex = (priorities.indexOf(priority) + 1) % priorities.length;
                    setPriority(priorities[nextIndex]);
                  })}
                >
                  {isPro ? (
                    <Flag className={`w-4 h-4 ${priority === "URGENT" ? "text-red-500" : priority === "HIGH" ? "text-orange-500" : priority === "MEDIUM" ? "text-blue-500" : "text-green-500"}`} />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={!isPro ? "text-muted-foreground" : "font-medium"}>
                    {isPro ? `Priority: ${priority}` : "Priority"}
                  </span>
                </Button>

                {currentActiveTags.map((tag) => (
                  <LinkTag key={tag.id} tag={tag} disabled />
                ))}
              </div>
            </div>
          </div>
          <EditorTasks
            workspaceId={workspaceId}
            taskId={taskId}
            content={content}
          />
        </CardContent>
      </form>
    </Card>
  );
};
