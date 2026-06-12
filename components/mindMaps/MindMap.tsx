"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { EdgeOptions } from "./EdgeOptions";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Edge,
  EdgeTypes,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  Panel,
  ReactFlowInstance,
  ReactFlowJsonObject,
  MiniMap
} from "reactflow";
import "reactflow/dist/style.css";
import { TextNode } from "./nodes/TextNode";
import { toPng } from "html-to-image";
import { getLayoutedElements } from "./layoutUtils";
import { CustomBezier } from "./labels/CustomBezier";
import { CustomStraight } from "./labels/CustomStraight";
import { CustomStepSharp } from "./labels/CustomStepSharp";
import { CustomStepRounded } from "./labels/CustomStepRounded";
import { Sheet } from "../ui/sheet";
import { EdgeOptionsSchema } from "@/schema/edgeOptionsSchema";
import { EdgeColor } from "@/types/enums";
import { MindMap as MindMapType, Tag } from "@prisma/client";
import { useDebouncedCallback } from "use-debounce";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { LoadingScreen } from "../common/LoadingScreen";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { PlusSquare, Save, Wand2 } from "lucide-react";
import { DeleteAllNodes } from "./DeleteAllNodes";
import { useAutoSaveMindMap } from "@/context/AutoSaveMindMap";
import { useAutosaveIndicator } from "@/context/AutosaveIndicator";
import { Separator } from "../ui/separator";
import { MindMapTagsSelector } from "./MindMapTagSelector";
import { EditInfo } from "./editInfo/EditInfo";
import { ShapeSidebar } from "./ShapeSidebar";
import { ExtendedMindMap } from "@/types/extended";
import { useTranslations } from "next-intl";
import { useSocket } from "@/context/SocketProvider";
import { useSession } from "next-auth/react";
import { LiveCursors } from "./LiveCursors";

const edgeTypes: EdgeTypes = {
  customBezier: CustomBezier,
  customStraight: CustomStraight,
  customStepSharp: CustomStepSharp,
  customStepRounded: CustomStepRounded,
};

import { CircleNode } from "./nodes/CircleNode";
import { DiamondNode } from "./nodes/DiamondNode";
import { SquareNode } from "./nodes/SquareNode";
import { TriangleNode } from "./nodes/TriangleNode";
import { ParallelogramNode } from "./nodes/ParallelogramNode";
import { HexagonNode } from "./nodes/HexagonNode";
import { CylinderNode } from "./nodes/CylinderNode";
import { CloudNode } from "./nodes/CloudNode";
import { IconNode } from "./nodes/IconNode";
import { DSANode } from "./nodes/DSANode";

const nodeTypes = { 
  textNode: TextNode,
  circleNode: CircleNode,
  diamondNode: DiamondNode,
  squareNode: SquareNode,
  triangleNode: TriangleNode,
  parallelogramNode: ParallelogramNode,
  hexagonNode: HexagonNode,
  cylinderNode: CylinderNode,
  cloudNode: CloudNode,
  iconNode: IconNode,
  dsaNode: DSANode
};

interface Props {
  initialInfo: ExtendedMindMap;
  workspaceId: string;
  canEdit: boolean;
  initialActiveTags: Tag[];
}

export const MindMap = ({
  initialInfo,
  workspaceId,
  canEdit,
  initialActiveTags,
}: Props) => {
  const [clickedEdge, setClickedEdge] = useState<Edge | null>(null);
  const [openSheet, setOpenSheet] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  const [isMounted, setIsMounted] = useState(false);
  const [isEditable, setIsEditable] = useState(canEdit);
  const t = useTranslations("MIND_MAP");

  const { setRfInstance, onSave, onSetIds } = useAutoSaveMindMap();
  const { onSetStatus, status } = useAutosaveIndicator();

  const { data: session } = useSession();
  const { 
    socket, 
    isConnected, 
    sendMindMapCursor, 
    sendMindMapNodesChange, 
    sendMindMapEdgesChange,
    sendMindMapSync
  } = useSocket();
  const [cursors, setCursors] = useState<Map<string, any>>(new Map());

  // Handle incoming socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCursorMove = (data: any) => {
      if (data.user?.id === session?.user?.id) return; // ignore our own
      setCursors(prev => {
        const next = new Map(prev);
        next.set(data.user.id, data);
        return next;
      });
    };

    const handleNodesChange = (changes: any[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    };

    const handleEdgesChange = (changes: any[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    };

    const handleSync = (flow: any) => {
      if (flow && flow.nodes) setNodes(flow.nodes);
      if (flow && flow.edges) setEdges(flow.edges);
    };

    socket.on("mindmap-cursor-move", handleCursorMove);
    socket.on("mindmap-nodes-change", handleNodesChange);
    socket.on("mindmap-edges-change", handleEdgesChange);
    socket.on("mindmap-sync", handleSync);

    // Clean up disconnected users
    const handleUserLeft = (data: { userId: string }) => {
      setCursors(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };
    socket.on("user-left", handleUserLeft);

    const handleLocalSave = (e: Event) => {
      const customEvent = e as CustomEvent;
      sendMindMapSync(workspaceId, customEvent.detail);
    };
    window.addEventListener('mindmap-local-save', handleLocalSave);

    return () => {
      socket.off("mindmap-cursor-move", handleCursorMove);
      socket.off("mindmap-nodes-change", handleNodesChange);
      socket.off("mindmap-edges-change", handleEdgesChange);
      socket.off("mindmap-sync", handleSync);
      socket.off("user-left", handleUserLeft);
      window.removeEventListener('mindmap-local-save', handleLocalSave);
    };
  }, [socket, isConnected, session?.user?.id, sendMindMapSync, workspaceId]);

  const debouncedMindMapInfo = useDebouncedCallback(() => {
    onSetStatus("pending");
    onSave();
  }, 3000);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const { content } = initialInfo;
    if (content) {
      const { nodes = [], edges = [] } =
        content as unknown as ReactFlowJsonObject;
      setNodes(nodes);
      setEdges(edges);
    }
    onSetIds(initialInfo.id, workspaceId);
  }, [initialInfo, initialInfo.id, workspaceId, onSetIds]);

  const onAddNode = useCallback(() => {
    const newNode = {
      id: Math.random().toString(),
      type: "textNode",
      position: { x: 0, y: 0 },
      data: { text: "test", color: 12 },
    };

    setNodes((nds) => nds.concat(newNode));
    onSetStatus("unsaved");
    debouncedMindMapInfo();
  }, [debouncedMindMapInfo, onSetStatus]);

  const onNodesChange: OnNodesChange = useCallback((changes: any) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    sendMindMapNodesChange(workspaceId, changes);
  }, [workspaceId, sendMindMapNodesChange]);

  useEffect(() => {
    setIsEditable(canEdit);
  }, [canEdit]);

  const onEdgesChange: OnEdgesChange = useCallback((changes: any) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    sendMindMapEdgesChange(workspaceId, changes);
  }, [workspaceId, sendMindMapEdgesChange]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!isEditable) return;
      setClickedEdge(edge);
      setOpenSheet(true);
    },
    [isEditable]
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge(params, eds));
      onSetStatus("unsaved");
      debouncedMindMapInfo();
    },
    [debouncedMindMapInfo, onSetStatus]
  );

  const onSaveChange = useCallback(
    (data: EdgeOptionsSchema) => {
      const { animated, edgeId, label, color, type } = data;
      setEdges((prevEdges) => {
        const edges = prevEdges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: label ? { label, color } : undefined,
                type,
                animated,
              }
            : edge
        );

        return edges;
      });
      setOpenSheet(false);
      onSetStatus("unsaved");
      debouncedMindMapInfo();
    },
    [debouncedMindMapInfo, onSetStatus]
  );

  const onDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((prevEdges) => {
        const edges = prevEdges.filter((edge) => edge.id !== edgeId);
        return edges;
      });
      setOpenSheet(false);
      onSetStatus("unsaved");
      debouncedMindMapInfo();
    },
    [debouncedMindMapInfo, onSetStatus]
  );

  const onNodeDrag = useCallback(() => {
    onSetStatus("unsaved");
    debouncedMindMapInfo();
  }, [debouncedMindMapInfo, onSetStatus]);

  const onNodesDelete = useCallback(() => {
    onSetStatus("unsaved");
    debouncedMindMapInfo();
  }, [debouncedMindMapInfo, onSetStatus]);

  const onDownloadImage = useCallback(() => {
    const viewportNode = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (viewportNode) {
      toPng(viewportNode, {
        backgroundColor: '#0a0a0a',
        pixelRatio: 2,
      }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `${initialInfo.title || 'MindMap'}.png`;
        link.href = dataUrl;
        link.click();
      });
    }
  }, [initialInfo.title]);

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      
      onSetStatus("unsaved");
      debouncedMindMapInfo();
    },
    [nodes, edges, setNodes, setEdges, debouncedMindMapInfo, onSetStatus]
  );

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type || !reactFlowInstance) {
        return;
      }

      let additionalData = {};
      try {
        const json = event.dataTransfer.getData('application/json');
        if (json) additionalData = JSON.parse(json);
      } catch (e) {}

      const position = reactFlowInstance.project({
        x: event.clientX - 264, // adjust for sidebar width approximately (expanded sidebar)
        y: event.clientY - 64, // adjust for header/toolbar height approximately
      });

      const newNode = {
        id: Math.random().toString(),
        type,
        position,
        data: { text: "Node", color: 12, ...additionalData },
      };

      setNodes((nds) => nds.concat(newNode));
      onSetStatus("unsaved");
      debouncedMindMapInfo();
    },
    [reactFlowInstance, debouncedMindMapInfo, onSetStatus]
  );

  const onPaneMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!reactFlowInstance || !session?.user) return;
      const position = reactFlowInstance.project({
        x: event.clientX - 64, // adjust for sidebar width approximately
        y: event.clientY - 64, // adjust for header/toolbar height approximately
      });
      
      sendMindMapCursor(workspaceId, position.x, position.y, session.user);
    },
    [reactFlowInstance, sendMindMapCursor, workspaceId, session]
  );

  if (!isMounted) return <LoadingScreen />;

  return (
    <div className="w-full h-full flex">
      {isEditable && <ShapeSidebar />}
      <div className="flex-1 h-full relative overflow-hidden">
        <LiveCursors cursors={cursors} rfInstance={reactFlowInstance} />
        {clickedEdge && (
          <Sheet open={openSheet} onOpenChange={setOpenSheet}>
            <EdgeOptions
              clickedEdge={clickedEdge}
              isOpen={openSheet}
              onSave={onSaveChange}
              onDeleteEdge={onDeleteEdge}
            />
          </Sheet>
        )}

        <ReactFlow
          fitView
          onInit={(instance) => {
            setRfInstance(instance);
            setReactFlowInstance(instance);
          }}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeDrag={onNodeDrag}
          onPaneMouseMove={onPaneMouseMove}
          nodes={nodes}
          nodeTypes={memoizedNodeTypes}
          edges={edges}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodesDelete={onNodesDelete}
          connectOnClick={isEditable}
          edgesUpdatable={isEditable}
          edgesFocusable={isEditable}
          nodesDraggable={isEditable}
          nodesConnectable={isEditable}
          nodesFocusable={isEditable}
          elementsSelectable={isEditable}
          snapToGrid={true}
          snapGrid={[15, 15]}
          proOptions={{
            hideAttribution: true,
          }}
        >
          {isEditable && (
            <Panel
              position="top-left"
              className="bg-background z-50 shadow-sm border rounded-sm py-0.5 px-3"
            >
              <div className="flex gap-2 w-full items-center">
                <HoverCard openDelay={250} closeDelay={250}>
                  <HoverCardTrigger asChild>
                    <Button variant={"ghost"} size={"icon"} onClick={onAddNode}>
                      <PlusSquare size={22} />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent align="start">
                    {t("HOVER_TIP.ADD_TITLE")}
                  </HoverCardContent>
                </HoverCard>

                <EditInfo
                  workspaceId={workspaceId}
                  title={initialInfo.title}
                  mapId={initialInfo.id}
                  emoji={initialInfo.emoji}
                />

                <HoverCard openDelay={250} closeDelay={250}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant={"ghost"}
                      size={"icon"}
                      onClick={() => {
                        onSetStatus("pending");
                        onSave();
                      }}
                      disabled={status === "pending" || status === "saved"}
                    >
                      <Save size={22} />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent align="start" sideOffset={8}>
                    {t("HOVER_TIP.SAVE")}
                  </HoverCardContent>
                </HoverCard>

                <HoverCard openDelay={250} closeDelay={250}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant={"ghost"}
                      size={"icon"}
                      onClick={onDownloadImage}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent align="start" sideOffset={8}>
                    Export as Image
                  </HoverCardContent>
                </HoverCard>

                <HoverCard openDelay={250} closeDelay={250}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant={"ghost"}
                      size={"icon"}
                      onClick={() => onLayout('TB')}
                    >
                      <Wand2 size={22} />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent align="start" sideOffset={8}>
                    Auto-Layout (Tidy Up)
                  </HoverCardContent>
                </HoverCard>

                <DeleteAllNodes
                  workspaceId={workspaceId}
                  mindMapId={initialInfo.id}
                />

                <div className="h-8">
                  <Separator orientation="vertical" />
                </div>

                <MindMapTagsSelector
                  initialActiveTags={initialActiveTags}
                  mindMapId={initialInfo.id}
                  isMounted={isMounted}
                  workspaceId={workspaceId}
                />
              </div>
            </Panel>
          )}

          <Background />
          <MiniMap 
            nodeColor={(n) => {
              if (n.data?.color) return '#a8a29e';
              return '#444';
            }}
            maskColor="rgba(0,0,0,0.4)"
            className="bg-background rounded-md shadow-md border"
          />
        </ReactFlow>
      </div>
    </div>
  );
};
