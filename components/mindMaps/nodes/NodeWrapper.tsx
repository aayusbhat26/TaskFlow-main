"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAutosaveIndicator } from "@/context/AutosaveIndicator";
import { useAutoSaveMindMap } from "@/context/AutoSaveMindMap";
import { cn } from "@/lib/utils";
import { MindMapItemColors } from "@/types/enums";
import { Check, MoreHorizontal, Palette, Pencil, Trash, Smile } from "lucide-react";
import { EmojiSelector } from "@/components/common/EmojiSelector";
import { useTranslations } from "next-intl";
import React, { useCallback, useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";
import { useDebouncedCallback } from "use-debounce";
import { unifiedToNative } from "@/lib/utils";

interface Props {
  nodeId: string;
  children: React.ReactNode;
  className?: string;
  color?: MindMapItemColors;
  shape?: "rectangle" | "circle" | "diamond" | "square";
  emoji?: string;
  isEditing: boolean;
  onIsEdit: () => void;
  onDelete: () => void;
}

const colors = [
  MindMapItemColors.BLUE,
  MindMapItemColors.CYAN,
  MindMapItemColors.DEFAULT,
  MindMapItemColors.EMERALD,
  MindMapItemColors.FUCHSIA,
  MindMapItemColors.GREEN,
  MindMapItemColors.INDIGO,
  MindMapItemColors.LIME,
  MindMapItemColors.ORANGE,
  MindMapItemColors.PINK,
  MindMapItemColors.PINK,
  MindMapItemColors.PURPLE,
  MindMapItemColors.RED,
];

export const NodeWrapper = ({
  nodeId,
  children,
  className,
  color = MindMapItemColors.DEFAULT,
  shape = "rectangle",
  emoji,
  isEditing,
  onIsEdit,
  onDelete,
}: Props) => {
  const [currColor, setCurrColor] = useState<MindMapItemColors | undefined>(
    color
  );
  const { setNodes } = useReactFlow();
  const { onSetStatus } = useAutosaveIndicator();
  const { onSave } = useAutoSaveMindMap();
  const t = useTranslations("MIND_MAP.NODE");

  const debouncedMindMapInfo = useDebouncedCallback(() => {
    onSetStatus("pending");
    onSave();
  }, 3000);

  const onSaveNodeColor = useCallback(
    (color: MindMapItemColors) => {
      setNodes((prevNodes) => {
        const nodes = prevNodes.map((node: any) =>
          node.id === nodeId ? { ...node, data: { ...node.data, color } } : node
        );
        return nodes;
      });
      onSetStatus("unsaved");
      debouncedMindMapInfo();
    },
    [setNodes, nodeId, debouncedMindMapInfo, onSetStatus]
  );

  const onSaveNodeEmoji = useCallback(
    (emojiUnified: string) => {
      const nativeEmoji = unifiedToNative(emojiUnified);
      setNodes((prevNodes) => {
        const nodes = prevNodes.map((node: any) =>
          node.id === nodeId ? { ...node, data: { ...node.data, emoji: nativeEmoji } } : node
        );
        return nodes;
      });
      onSetStatus("unsaved");
      debouncedMindMapInfo();
    },
    [setNodes, nodeId, debouncedMindMapInfo, onSetStatus]
  );

  const onDeleteNode = useCallback(() => {
    setNodes((prevNodes) => {
      const nodes = prevNodes.filter((node) => node.id !== nodeId);

      return nodes;
    });
    onDelete();
  }, [setNodes, nodeId, onDelete]);

  const onColorSelect = useCallback(
    (newColor: MindMapItemColors) => {
      setCurrColor(newColor);
      onSaveNodeColor(newColor);
    },
    [onSaveNodeColor]
  );

  const nodeColor = useCallback((color: MindMapItemColors) => {
    switch (color) {
      case MindMapItemColors.PURPLE:
        return "!bg-purple-600 hover:bg-purple-500 text-white";
      case MindMapItemColors.GREEN:
        return "!bg-green-600 hover:bg-green-500 text-white";
      case MindMapItemColors.RED:
        return "!bg-red-600 hover:bg-red-500 text-white";
      case MindMapItemColors.BLUE:
        return "!bg-blue-600 hover:bg-blue-500 text-white";
      case MindMapItemColors.CYAN:
        return "!bg-cyan-600 hover:bg-cyan-500 text-white";
      case MindMapItemColors.EMERALD:
        return "!bg-emerald-600 hover:bg-emerald-500 text-white";
      case MindMapItemColors.INDIGO:
        return "!bg-indigo-600 hover:bg-indigo-500 text-white";
      case MindMapItemColors.LIME:
        return "!bg-lime-600 hover:bg-limes-500 text-white";
      case MindMapItemColors.ORANGE:
        return "!bg-orange-600 hover:bg-orange-500 text-white";
      case MindMapItemColors.FUCHSIA:
        return "!bg-fuchsia-600 hover:bg-fuchsia-500 text-white";
      case MindMapItemColors.PINK:
        return "!bg-pink-600 hover:bg-pink-500 text-white";
      case MindMapItemColors.YELLOW:
        return "!bg-yello-600 hover:bg-yellow-500 text-white";
      default:
        return "!bg-secondary hover:bg-secondary-500";
    }
  }, []);

  const getShapeClasses = (shape: string) => {
    switch (shape) {
      case "circle":
        return "rounded-full w-32 h-32 flex items-center justify-center p-2 text-center aspect-square";
      case "square":
        return "rounded-md w-32 h-32 flex items-center justify-center p-2 text-center aspect-square";
      case "diamond":
        return "rounded-md w-32 h-32 flex items-center justify-center p-2 text-center aspect-square rotate-45";
      case "triangle":
        return "w-36 h-32 flex items-center justify-center p-2 pt-10 text-center clip-path-triangle";
      case "parallelogram":
        return "w-40 h-28 flex items-center justify-center p-2 text-center clip-path-parallelogram";
      case "hexagon":
        return "w-40 h-32 flex items-center justify-center p-2 text-center clip-path-hexagon";
      case "cylinder":
        return "w-32 h-40 flex items-center justify-center p-2 pt-6 text-center border-t-[8px] border-b-[8px] border-t-white/20 border-b-black/20 rounded-[50%/15%]";
      case "cloud":
        return "w-48 h-32 flex items-center justify-center p-2 pt-4 text-center clip-path-cloud";
      case "ellipse":
        return "w-40 h-24 rounded-[50%] flex items-center justify-center p-2 text-center";
      case "pentagon":
        return "w-36 h-36 clip-path-pentagon flex items-center justify-center p-2 pt-8 text-center";
      case "octagon":
        return "w-36 h-36 clip-path-octagon flex items-center justify-center p-2 text-center";
      case "star":
        return "w-40 h-40 clip-path-star flex items-center justify-center p-2 pt-4 text-center";
      case "rectangle":
      default:
        return "rounded-md w-40 min-h-[4rem] h-fit p-2 flex items-center justify-center text-center";
    }
  };

  return (
    <div
      className={cn(
        `text-xs shadow-sm transition-colors duration-200 gap-2 relative ${nodeColor(
          currColor!
        )} ${getShapeClasses(shape)}`,
        className
      )}
    >
      <div className={` ${isEditing ? "w-full" : "w-[90%]"} text-lg`}>
        <div className="flex gap-2 w-full h-fit flex-col relative">
          {emoji && <span className="absolute -top-7 -left-3 text-2xl">{emoji}</span>}
          {children}
        </div>
        <>
          <Handle
            type="target"
            position={Position.Top}
            id="top"
            className={`transition-colors !border-popover duration-200 p-1`}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            className={`transition-colors !border-popover duration-200 p-1`}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className={`transition-colors !border-popover duration-200 p-1`}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            className={`transition-colors !border-popover duration-200 p-1`}
          />
        </>
      </div>
      {isEditing && (
        <div className={`flex items-center gap-0.5 ${shape === "diamond" ? "absolute -top-10 -right-10 rotate-45" : "absolute -top-10 right-0"}`}>
          <EmojiSelector onSelectedEmoji={onSaveNodeEmoji}>
            <Button
              className={`w-6 h-6 hover:bg-transparent ${
                currColor === MindMapItemColors.DEFAULT
                  ? ""
                  : "text-white hover:text-white"
              }`}
              variant={"ghost"}
              size={"icon"}
            >
              <Smile size={16} />
            </Button>
          </EmojiSelector>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={`w-6 h-6 hover:bg-transparent ${
                  currColor === MindMapItemColors.DEFAULT
                    ? ""
                    : "text-white hover:text-white"
                }`}
                variant={"ghost"}
                size={"icon"}
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={-10} align="start" className="min-w-[12rem]">
            <DropdownMenuItem
              onClick={() => {
                onIsEdit();
              }}
              className="cursor-pointer gap-2"
            >
              <Pencil size={16} />
              <span>{t("EDIT")}</span>
            </DropdownMenuItem>{" "}
            <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
              <Palette size={16} />
              <span>{t("COLOR")}</span>
            </div>
            <div className="px-2 py-1.5 grid grid-cols-5 gap-3">
              {colors.map((color, i) => (
                <Button
                  key={i}
                  onClick={() => {
                    onColorSelect(color);
                  }}
                  className={`w-6 h-6 p-1 rounded-full ${nodeColor(color)}`}
                >
                  {color === currColor && (
                    <Check
                      className={`${
                        color !== MindMapItemColors.DEFAULT
                          ? "text-white"
                          : ""
                      }`}
                      size={14}
                    />
                  )}
                </Button>
              ))}
            </div>
            <DropdownMenuItem
              onClick={() => {
                onDeleteNode();
              }}
              className="cursor-pointer gap-2"
            >
              <Trash size={16} />
              {t("DELETE")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      )}
    </div>
  );
};
