import React, { useState } from 'react';
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Server, Database, HardDrive, Cpu, Network, Monitor, Smartphone, Lock, Activity, Layout, List, Box, GitBranch, Github, Layers, Code, FileText, Share2, Settings, User, Link, Workflow, Zap, Shield, Image, Video, Mail, MessageSquare, Cloud, Search, ArrowRightLeft, Blocks, Puzzle, Anchor, Package, Component, Bot, Sparkles, BrainCircuit, Play, RectangleHorizontal, CheckSquare } from "lucide-react";
import { MindMapItemColors } from '@/types/enums';


const SHAPE_CATEGORIES = [
  {
    title: "Basic Geometric Shapes",
    items: [
      { type: "textNode", label: "Rectangle", preview: <div className="w-8 h-4 border-2 border-primary rounded-sm" /> },
      { type: "circleNode", label: "Circle", preview: <div className="w-6 h-6 border-2 border-primary rounded-full" /> },
      { type: "diamondNode", label: "Diamond", preview: <div className="w-5 h-5 border-2 border-primary rounded-sm rotate-45 m-1" /> },
      { type: "squareNode", label: "Square", preview: <div className="w-6 h-6 border-2 border-primary rounded-sm" /> },
      { type: "triangleNode", label: "Triangle", preview: <div className="w-6 h-6 border-2 border-primary clip-path-triangle" /> },
      { type: "hexagonNode", label: "Hexagon", preview: <div className="w-6 h-6 border-2 border-primary clip-path-hexagon" /> },
      { type: "parallelogramNode", label: "Parallelogram", preview: <div className="w-8 h-5 border-2 border-primary clip-path-parallelogram" /> },
      { type: "cylinderNode", label: "Cylinder", preview: <div className="w-6 h-7 border-2 border-primary border-t-[3px] border-b-[3px] rounded-[50%/15%]" /> },
      { type: "cloudNode", label: "Cloud", preview: <div className="w-8 h-5 border-2 border-primary clip-path-cloud" /> },
    ]
  },
  {
    title: "Data Structures (DSA)",
    items: [
      { type: "dsaNode", data: { dsaType: "array", text: "Array" }, label: "Array", preview: <div className="w-8 h-4 border-2 border-primary flex"><div className="border-r-2 border-primary w-1/3"></div><div className="border-r-2 border-primary w-1/3"></div></div> },
      { type: "dsaNode", data: { dsaType: "linkedlist", text: "Linked List" }, label: "Linked List", preview: <div className="w-8 h-4 flex items-center"><div className="w-3 h-3 border-2 border-primary"></div><div className="w-2 h-0.5 bg-primary"></div><div className="w-3 h-3 border-2 border-primary"></div></div> },
      { type: "dsaNode", data: { dsaType: "stack", text: "Stack" }, label: "Stack", preview: <div className="w-5 h-6 border-2 border-t-0 border-primary flex flex-col"><div className="border-b-2 border-primary h-1/2"></div></div> },
      { type: "dsaNode", data: { dsaType: "queue", text: "Queue" }, label: "Queue", preview: <div className="w-8 h-4 border-t-2 border-b-2 border-primary flex"><div className="border-r-2 border-primary w-1/3"></div><div className="border-r-2 border-primary w-1/3"></div></div> },
      { type: "dsaNode", data: { dsaType: "matrix", text: "Matrix" }, label: "Matrix", preview: <div className="w-6 h-6 border-2 border-primary grid grid-cols-2 grid-rows-2"><div className="border-r-2 border-b-2 border-primary"></div><div className="border-b-2 border-primary"></div><div className="border-r-2 border-primary"></div></div> },
    ]
  },
  {
    title: "System Design Components",
    items: [
      { type: "iconNode", data: { icon: "Server", text: "Server" }, label: "Server", preview: <Server size={20} /> },
      { type: "iconNode", data: { icon: "Database", text: "Database" }, label: "Database", preview: <Database size={20} /> },
      { type: "iconNode", data: { icon: "HardDrive", text: "Storage" }, label: "Storage", preview: <HardDrive size={20} /> },
      { type: "iconNode", data: { icon: "Cpu", text: "Compute" }, label: "Compute", preview: <Cpu size={20} /> },
      { type: "iconNode", data: { icon: "Network", text: "Network" }, label: "Network", preview: <Network size={20} /> },
      { type: "iconNode", data: { icon: "Monitor", text: "Client" }, label: "Client", preview: <Monitor size={20} /> },
      { type: "iconNode", data: { icon: "Smartphone", text: "Mobile" }, label: "Mobile", preview: <Smartphone size={20} /> },
      { type: "iconNode", data: { icon: "ArrowRightLeft", text: "Load Balancer" }, label: "Load Balancer", preview: <ArrowRightLeft size={20} /> },
    ]
  },
  {
    title: "Database Components",
    items: [
      { type: "iconNode", data: { icon: "Database", text: "SQL Database" }, label: "SQL Database", preview: <Database size={20} /> },
      { type: "iconNode", data: { icon: "Layers", text: "NoSQL Database" }, label: "NoSQL Database", preview: <Layers size={20} /> },
      { type: "iconNode", data: { icon: "Table", text: "Table" }, label: "Table", preview: <List size={20} /> },
      { type: "iconNode", data: { icon: "Blocks", text: "Partition/Shard" }, label: "Shard", preview: <Blocks size={20} /> },
      { type: "iconNode", data: { icon: "Search", text: "Index" }, label: "Index", preview: <Search size={20} /> },
    ]
  },
  {
    title: "DevOps & CI/CD",
    items: [
      { type: "iconNode", data: { icon: "GitBranch", text: "Git Repo" }, label: "Git Repository", preview: <GitBranch size={20} /> },
      { type: "iconNode", data: { icon: "Play", text: "CI/CD Pipeline" }, label: "Pipeline", preview: <Play size={20} /> },
      { type: "iconNode", data: { icon: "Box", text: "Docker/Container" }, label: "Container", preview: <Box size={20} /> },
      { type: "iconNode", data: { icon: "Anchor", text: "Kubernetes" }, label: "Kubernetes", preview: <Anchor size={20} /> },
      { type: "iconNode", data: { icon: "Puzzle", text: "Terraform" }, label: "Terraform", preview: <Puzzle size={20} /> },
      { type: "iconNode", data: { icon: "Settings", text: "Config" }, label: "Config", preview: <Settings size={20} /> },
    ]
  },
  {
    title: "Cloud Services",
    items: [
      { type: "iconNode", data: { icon: "Cloud", text: "Cloud Provider" }, label: "Cloud", preview: <Cloud size={20} /> },
      { type: "iconNode", data: { icon: "Package", text: "S3 / Blob Storage" }, label: "Object Storage", preview: <Package size={20} /> },
      { type: "iconNode", data: { icon: "Zap", text: "Lambda / Functions" }, label: "Functions", preview: <Zap size={20} /> },
      { type: "iconNode", data: { icon: "Shield", text: "IAM / Security" }, label: "Security", preview: <Shield size={20} /> },
      { type: "iconNode", data: { icon: "Workflow", text: "API Gateway" }, label: "API Gateway", preview: <Workflow size={20} /> },
    ]
  },
  {
    title: "Miscellaneous CS",
    items: [
      { type: "iconNode", data: { icon: "User", text: "User" }, label: "User", preview: <User size={20} /> },
      { type: "iconNode", data: { icon: "Bot", text: "AI / Bot" }, label: "AI Bot", preview: <Bot size={20} /> },
      { type: "iconNode", data: { icon: "BrainCircuit", text: "LLM" }, label: "LLM", preview: <BrainCircuit size={20} /> },
      { type: "iconNode", data: { icon: "Sparkles", text: "Feature" }, label: "Feature", preview: <Sparkles size={20} /> },
      { type: "iconNode", data: { icon: "Activity", text: "Metrics" }, label: "Metrics", preview: <Activity size={20} /> },
    ]
  },
  {
    title: "UML Shapes",
    items: [
      { type: "textNode", data: { text: "Class" }, label: "Class", preview: <div className="w-8 h-6 border-2 border-primary rounded-sm flex flex-col"><div className="border-b-2 border-primary h-1/3"></div></div> },
      { type: "iconNode", data: { icon: "Code", text: "<<Interface>>" }, label: "Interface", preview: <Code size={20} /> },
      { type: "iconNode", data: { icon: "Component", text: "Component" }, label: "Component", preview: <Component size={20} /> },
      { type: "iconNode", data: { icon: "FileText", text: "Note" }, label: "Note", preview: <FileText size={20} /> },
    ]
  },
  {
    title: "ER Diagram",
    items: [
      { type: "textNode", data: { text: "Entity" }, label: "Entity", preview: <RectangleHorizontal size={20} /> },
      { type: "circleNode", data: { text: "Attribute" }, label: "Attribute", preview: <div className="w-6 h-4 border-2 border-primary rounded-[50%]" /> },
      { type: "diamondNode", data: { text: "Relationship" }, label: "Relationship", preview: <div className="w-4 h-4 border-2 border-primary rounded-sm rotate-45" /> },
      { type: "iconNode", data: { icon: "Link", text: "Foreign Key" }, label: "Foreign Key", preview: <Link size={20} /> },
    ]
  },
  {
    title: "Flowchart",
    items: [
      { type: "circleNode", data: { text: "Start / End" }, label: "Start/End", preview: <div className="w-6 h-4 border-2 border-primary rounded-full" /> },
      { type: "textNode", data: { text: "Process" }, label: "Process", preview: <div className="w-6 h-4 border-2 border-primary rounded-sm" /> },
      { type: "diamondNode", data: { text: "Decision" }, label: "Decision", preview: <div className="w-4 h-4 border-2 border-primary rounded-sm rotate-45" /> },
      { type: "parallelogramNode", data: { text: "I/O" }, label: "Input/Output", preview: <div className="w-6 h-4 border-2 border-primary clip-path-parallelogram" /> },
    ]
  }
];

export const ShapeSidebar = () => {
  const t = useTranslations("MIND_MAP");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Basic Geometric Shapes": true,
    "Data Structures (DSA)": true,
    "System Design Components": true,
  });

  const toggleCategory = (title: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const onDragStart = (event: React.DragEvent, nodeType: string, additionalData?: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    if (additionalData) {
      event.dataTransfer.setData('application/json', JSON.stringify(additionalData));
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 h-full flex flex-col border-r bg-background shrink-0 overflow-y-auto scrollbar-hide shadow-sm z-10">
      <div className="p-4 border-b bg-muted/30 sticky top-0 z-10">
        <h3 className="font-semibold text-sm">Shapes & Components</h3>
        <p className="text-xs text-muted-foreground mt-1">Drag and drop onto canvas</p>
      </div>
      <div className="w-full flex flex-col">
        {SHAPE_CATEGORIES.map((category, idx) => {
          const isOpen = openCategories[category.title];
          return (
            <div key={idx} className="flex flex-col border-b last:border-b-0">
              <button
                onClick={() => toggleCategory(category.title)}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 text-sm font-semibold transition-colors"
              >
                <span>{category.title}</span>
                {isOpen ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              </button>
              
              {isOpen && (
                <div className="p-2 bg-muted/10 grid grid-cols-2 gap-2 border-t">
                  {category.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex flex-col items-center justify-center p-3 py-4 gap-2 border bg-background rounded-md cursor-grab hover:border-primary hover:shadow-sm transition-all text-primary"
                      onDragStart={(event) => onDragStart(event, item.type, item.data)}
                      draggable
                      title={item.label}
                    >
                      <div className="flex items-center justify-center h-8">
                        {item.preview}
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center font-medium leading-tight">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
