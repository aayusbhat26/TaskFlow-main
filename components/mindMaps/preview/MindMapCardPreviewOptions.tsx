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
  workspaceId: string;
  mindMapId: string;
  userRole: UserPermission | null;
  onSetIsSaved: () => void;
}

export const MindMapCardPreviewOptions = ({
  isSaved,
  workspaceId,
  mindMapId,
  userRole,
  onSetIsSaved,
}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const m = useTranslations("MESSAGES");
  const t = useTranslations("MIND_MAP.PREVIEW");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const router = useRouter();

  const { mutate: deleteMindMap, isPending } = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/mind_maps/delete`, {
        mindMapId,
        workspaceId,
      });
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data ? err.response.data : "ERRORS_DEFAULT";

      toast({
        title: m(error),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: m("SUCCESS.MIND_MAP_DELETED"),
      });

      //@ts-ignore
      queryClient.invalidateQueries(["getWorkspaceShortcuts"]);

      router.push(`/dashboard/workspace/${workspaceId}`);
      router.refresh();
    },

    mutationKey: ["deleteMindMap"],
  });

  const { mutate: toggleSaveMindMap } = useMutation({
    mutationFn: async () => {
      await axios.post(`/api/saved/mind_maps/toggle_mind_map`, {
        mindMapId,
      });
    },
    onError: (err: AxiosError) => {
      const error = err?.response?.data ? err.response.data : "ERRORS_DEFAULT";

      onSetIsSaved();

      toast({
        title: m(error),
        variant: "destructive",
      });
    },
    onSuccess: () => {
      onSetIsSaved();
      router.refresh();
    },

    mutationKey: ["toggleSaveMindMap"],
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"ghost"}
            size={"icon"}
            className="text-primary hover:text-primary"
          >
            <MoreHorizontal size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="end" sideOffset={-8}>
            <DropdownMenuItem
              onClick={() => {
                toggleSaveMindMap();
              }}
              className="cursor-pointer"
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
                <DropdownMenuItem className="cursor-pointer">
                  <Link
                    href={`/dashboard/workspace/${workspaceId}/mind-maps/mind-map/${mindMapId}/edit`}
                  >
                    <Pencil size={16} className="mr-2"></Pencil>
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
            onClick={() => deleteMindMap()}
            size={"lg"}
            variant={"destructive"}
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
