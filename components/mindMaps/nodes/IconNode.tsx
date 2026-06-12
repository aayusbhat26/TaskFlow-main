"use client";

import { NodeProps, useReactFlow } from "reactflow";
import { NodeWrapper } from "./NodeWrapper";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { textNodeSchema, TextNodeSchema } from "@/schema/nodesSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import TextAreaAutosize from "react-textarea-autosize";
import { useAutosaveIndicator } from "@/context/AutosaveIndicator";
import { useAutoSaveMindMap } from "@/context/AutoSaveMindMap";
import { useDebouncedCallback } from "use-debounce";
import { useTranslations } from "next-intl";
import * as Icons from "lucide-react";
import { MindMapItemColors } from "@/types/enums";
import { useSocket } from "@/context/SocketProvider";

type NodeData = {
  text: string;
  color: MindMapItemColors;
  emoji?: string;
  icon: string;
  onDelete: () => void;
};

export const IconNode = ({ data, id }: NodeProps<NodeData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const _nodeText = useRef<HTMLTextAreaElement>(null);

  const { setNodes } = useReactFlow();
  const { onSetStatus } = useAutosaveIndicator();
  const { onSave } = useAutoSaveMindMap();
  const { socket, isConnected, sendMindMapSync } = useSocket();

  const debouncedMindMapInfo = useDebouncedCallback(() => {
    onSetStatus("pending");
    onSave();
  }, 3000);

  const onSaveNode = useCallback(
    (nodeId: string, nodeText: string) => {
      setNodes((prevNodes) => {
        const nodes = prevNodes.map((node: any) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, text: nodeText } }
            : node
        );
        return nodes;
      });
      onSetStatus("unsaved");
      debouncedMindMapInfo();
    },
    [setNodes, debouncedMindMapInfo, onSetStatus]
  );
  
  const t = useTranslations("MIND_MAP.NODE");

  const form = useForm<TextNodeSchema>({
    resolver: zodResolver(textNodeSchema),
    defaultValues: {
      text: t("PLACEHOLDER"),
    },
  });

  const onIsEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    form.setValue("text", e.target.value);
    onSaveNode(id, e.target.value);
  };

  const onSubmit = (data: TextNodeSchema) => {
    onSaveNode(id, data.text);
    setIsEditing(false);
  };

  useEffect(() => {
    if (data.text !== form.getValues("text")) {
      form.setValue("text", data.text);
    }
  }, [data.text, form]);

  useEffect(() => {
    if (isEditing && _nodeText.current) {
      _nodeText.current.focus();
    }
  }, [isEditing]);

  const { ref: nodeText, ...rest } = form.register("text");

  // @ts-ignore
  const IconComponent = Icons[data.icon] || Icons.Box;

  return (
    <NodeWrapper
      nodeId={id}
      color={data.color}
      emoji={data.emoji}
      shape="rectangle"
      isEditing={isEditing}
      onIsEdit={onIsEdit}
      onDelete={data.onDelete}
    >
      <div className="flex flex-col items-center justify-center gap-2 w-full p-2">
        <IconComponent size={40} className={data.color !== MindMapItemColors.DEFAULT ? "text-white" : "text-primary"} />
        <form
          onDoubleClick={onIsEdit}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col items-center justify-center w-full"
        >
          {isEditing ? (
            <TextAreaAutosize
              {...rest}
              ref={(e) => {
                //@ts-ignore
                nodeText(e);
                //@ts-ignore
                _nodeText.current = e;
              }}
              onBlur={() => {
                setIsEditing(false);
                form.handleSubmit(onSubmit)();
              }}
              onChange={onTextChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)();
                }
              }}
              className="w-full min-h-[2rem] resize-none appearance-none overflow-hidden bg-transparent placeholder:text-muted-foreground font-semibold focus:outline-none text-center"
              placeholder={t("PLACEHOLDER")}
            />
          ) : (
            <p className="w-full text-center whitespace-pre-wrap break-words font-semibold text-sm">
              {data.text || t("PLACEHOLDER")}
            </p>
          )}
        </form>
      </div>
    </NodeWrapper>
  );
};
