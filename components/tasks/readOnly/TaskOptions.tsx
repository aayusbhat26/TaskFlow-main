"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/ui/loadingState";
import Warning from "@/components/ui/warning";
import { useToast } from "@/hooks/use-toast";
import { UserPermission } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { MoreHorizontal, Pencil, Star, StarOff, Trash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

interface Props {
  isSaved: boolean;
  taskId: string;
  workspaceId: string;
  userRole: UserPermission | null;
  onSetIsSaved: () => void;
}

export const TaskOptions = ({
  isSaved,
  taskId,
  workspaceId,
  userRole,
  onSetIsSaved,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const m = useTranslations("MESSAGES");
  const t = useTranslations("TASK.EDITOR.READ_ONLY");
  const { toast } = useToast();
  const router = useRouter();

  const queryClient = useQueryClient();

  const { mutate: deleteTask, isPending } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/task/delete", {
        workspaceId,
        taskId,
      });
    },
    onSuccess: () => {
      toast({
        title: m("SUCCESS.TASK_DELETED"),
      });

      queryClient.invalidateQueries(["getWorkspaceShortcuts"] as any);

      router.push(`/dashboard/workspace/${workspaceId}`);
      router.refresh();
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data ? err.response.data : "ERRORS.DEFAULT";

      toast({
        title: m(error),
        variant: "destructive",
      });
    },
    mutationKey: ["deleteTask"],
  });

  const { mutate: toggleSaveTask } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/saved/tasks/toggleTask", {
        taskId,
      });
    },
    onMutate: () => {
      onSetIsSaved();
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data ? err.response.data : "ERRORS.DEFAULT";

      onSetIsSaved();

      toast({
        title: m(error),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      router.refresh();
    },
    mutationKey: ["toggleSaveTask"],
  });
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="text-primary hover:text-primary"
            variant={"ghost"}
            size={"icon"}
          >
            <MoreHorizontal size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                toggleSaveTask();
              }}
            >
              {isSaved ? (
                <>
                  <StarOff size={16} className="mr-2" />
                  {t("REMOVE_FROM_FAV")}
                </>
              ) : (
                <>
                  <Star size={16} className="mr-2" />
                  {t("ADD_TO_FAV")}
                </>
              )}
            </DropdownMenuItem>
            {userRole && userRole !== "READ_ONLY" && (
              <>
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link
                    href={`/dashboard/workspace/${workspaceId}/tasks/task/${taskId}/edit`}
                  >
                    <Pencil size={16} className="mr-2" />
                    {t("EDIT")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DialogTrigger className="w-full">
                  <DropdownMenuItem className="cursor-pointer">
                    <Trash size={16} className="mr-2" />
                    {t("DELETE")}
                  </DropdownMenuItem>
                </DialogTrigger>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("DIALOG.TITLE")}</DialogTitle>
          </DialogHeader>
          <Warning>
            <p>{t("DIALOG.DESC")}</p>
          </Warning>

          <Button
            size={"lg"}
            variant={"destructive"}
            onClick={() => {
              deleteTask();
            }}
          >
            {isPending ? (
              <LoadingState loadingText={t("DIALOG.BTN_PENDING")} />
            ) : (
              t("DIALOG.BTN_DELETE")
            )}
          </Button>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
