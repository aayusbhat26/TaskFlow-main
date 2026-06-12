"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { ReactFlowInstance, ReactFlowJsonObject } from "reactflow";
import { useAutosaveIndicator } from "./AutosaveIndicator";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface AutoSaveMindMapContext {
  onSave: () => void;
  setRfInstance: React.Dispatch<React.SetStateAction<ReactFlowInstance | null>>;
  onSetIds: (mindMapId: string, workspaceId: string) => void;
}

interface Props {
  children: React.ReactNode;
}

export const AutoSaveMindMapCtx = createContext<AutoSaveMindMapContext | null>(
  null
);

export const AutoSaveMindMapProvider = ({ children }: Props) => {
  const [rfInstance, setRfInstance] = useState<null | ReactFlowInstance>(null);
  const [ids, setIds] = useState<null | {
    mindMapId: string;
    workspaceId: string;
  }>(null);
  const { onSetStatus } = useAutosaveIndicator();

  const { toast } = useToast();

  const { mutate: updateMindMap } = useMutation({
    mutationFn: async (flow: ReactFlowJsonObject) => {
      console.log(ids);
      await axios.post(`/api/mind_maps/update`, {
        content: flow,
        mindMapId: ids?.mindMapId,
        workspaceId: ids?.workspaceId,
      });
    },
    onSuccess: () => {
      onSetStatus("saved");
    },
    onError: () => {
      onSetStatus("unsaved");
      toast({
        title: "Error saving mindmap",
        variant: "destructive",
      });
    },
  });

  const onSave = useCallback(() => {
    //@ts-ignore
    if (rfInstance && ids) {
      console.log("Coming inside");
      const flow = rfInstance?.toObject();
      //@ts-ignore
      updateMindMap(flow);
      
      // Dispatch custom event to notify MindMap.tsx to sync
      const event = new CustomEvent('mindmap-local-save', { detail: flow });
      window.dispatchEvent(event);
    }
  }, [rfInstance, updateMindMap, ids]);

  const onSetIds = useCallback((mindMapId: string, workspaceId: string) => {
    setIds({ mindMapId, workspaceId });
  }, []);

  return (
    <AutoSaveMindMapCtx.Provider value={{ setRfInstance, onSave, onSetIds }}>
      {children}
    </AutoSaveMindMapCtx.Provider>
  );
};

export const useAutoSaveMindMap = () => {
  const ctx = useContext(AutoSaveMindMapCtx);
  if (!ctx) throw new Error("invalid use");

  return ctx;
};
