"use client";

import { NodeProps, useReactFlow } from "reactflow";
import { NodeWrapper } from "./NodeWrapper";
import { useCallback, useEffect, useState } from "react";
import { useAutosaveIndicator } from "@/context/AutosaveIndicator";
import { useAutoSaveMindMap } from "@/context/AutoSaveMindMap";
import { useDebouncedCallback } from "use-debounce";
import { MindMapItemColors } from "@/types/enums";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NodeData = {
  text?: string;
  color: MindMapItemColors;
  emoji?: string;
  dsaType: 'array' | 'linkedlist' | 'stack' | 'queue' | 'matrix';
  cells?: string[]; // For linear structures
  matrix?: string[][]; // For matrix
  onDelete: () => void;
};

export const DSANode = ({ data, id }: NodeProps<NodeData>) => {
  const { setNodes } = useReactFlow();
  const { onSetStatus } = useAutosaveIndicator();
  const { onSave } = useAutoSaveMindMap();
  
  const [cells, setCells] = useState<string[]>(data.cells || ['1', '2', '3']);
  const [matrix, setMatrix] = useState<string[][]>(data.matrix || [['1', '2'], ['3', '4']]);

  const debouncedMindMapInfo = useDebouncedCallback(() => {
    onSetStatus("pending");
    onSave();
  }, 3000);

  const updateNodeData = useCallback((newData: Partial<NodeData>) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    onSetStatus("unsaved");
    debouncedMindMapInfo();
  }, [id, setNodes, debouncedMindMapInfo, onSetStatus]);

  useEffect(() => {
    if (data.cells) setCells(data.cells);
    if (data.matrix) setMatrix(data.matrix);
  }, [data.cells, data.matrix]);

  // Handlers for 1D structures
  const addCell = () => {
    const newCells = [...cells, ''];
    setCells(newCells);
    updateNodeData({ cells: newCells });
  };

  const removeCell = () => {
    if (cells.length > 1) {
      const newCells = cells.slice(0, -1);
      setCells(newCells);
      updateNodeData({ cells: newCells });
    }
  };

  const updateCell = (index: number, val: string) => {
    const newCells = [...cells];
    newCells[index] = val;
    setCells(newCells);
    updateNodeData({ cells: newCells });
  };

  // Handlers for Matrix
  const addRow = () => {
    const newRow = Array(matrix[0]?.length || 1).fill('');
    const newMatrix = [...matrix, newRow];
    setMatrix(newMatrix);
    updateNodeData({ matrix: newMatrix });
  };

  const removeRow = () => {
    if (matrix.length > 1) {
      const newMatrix = matrix.slice(0, -1);
      setMatrix(newMatrix);
      updateNodeData({ matrix: newMatrix });
    }
  };

  const addCol = () => {
    const newMatrix = matrix.map(row => [...row, '']);
    setMatrix(newMatrix);
    updateNodeData({ matrix: newMatrix });
  };

  const removeCol = () => {
    if (matrix[0]?.length > 1) {
      const newMatrix = matrix.map(row => row.slice(0, -1));
      setMatrix(newMatrix);
      updateNodeData({ matrix: newMatrix });
    }
  };

  const updateMatrixCell = (r: number, c: number, val: string) => {
    const newMatrix = matrix.map((row, ri) => 
      row.map((col, ci) => ri === r && ci === c ? val : col)
    );
    setMatrix(newMatrix);
    updateNodeData({ matrix: newMatrix });
  };

  const renderArray = () => (
    <div className="flex flex-col items-center gap-1">
      <div className="flex border-2 border-primary rounded-sm overflow-hidden bg-background">
        {cells.map((val, i) => (
          <div key={i} className="flex flex-col border-r-2 last:border-r-0 border-primary">
            <Input
              value={val}
              onChange={(e) => updateCell(i, e.target.value)}
              className="w-10 h-10 text-center border-none rounded-none focus-visible:ring-0 p-0 font-mono"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="w-6 h-6" onClick={removeCell} disabled={cells.length <= 1}><Minus size={12} /></Button>
        <Button variant="outline" size="icon" className="w-6 h-6" onClick={addCell}><Plus size={12} /></Button>
      </div>
    </div>
  );

  const renderLinkedList = () => (
    <div className="flex items-center gap-2">
      {cells.map((val, i) => (
        <div key={i} className="flex items-center">
          <div className="flex border-2 border-primary rounded-sm bg-background overflow-hidden">
            <Input
              value={val}
              onChange={(e) => updateCell(i, e.target.value)}
              className="w-10 h-10 text-center border-none rounded-none focus-visible:ring-0 p-0 font-mono"
            />
            <div className="w-6 h-10 flex items-center justify-center border-l-2 border-primary bg-muted">
              •
            </div>
          </div>
          {i < cells.length - 1 && <div className="w-6 h-0.5 bg-primary relative"><div className="absolute right-0 -top-1 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-primary"></div></div>}
        </div>
      ))}
      <div className="flex flex-col gap-1 ml-2">
        <Button variant="outline" size="icon" className="w-6 h-6" onClick={addCell}><Plus size={12} /></Button>
        <Button variant="outline" size="icon" className="w-6 h-6" onClick={removeCell} disabled={cells.length <= 1}><Minus size={12} /></Button>
      </div>
    </div>
  );

  const renderStack = () => (
    <div className="flex gap-2 items-end">
      <div className="flex flex-col border-2 border-t-0 border-primary rounded-b-md bg-background w-14">
        {[...cells].reverse().map((val, i) => (
          <Input
            key={i}
            value={val}
            onChange={(e) => updateCell(cells.length - 1 - i, e.target.value)}
            className="w-full h-10 text-center border-none border-b-2 last:border-b-0 border-primary rounded-none focus-visible:ring-0 p-0 font-mono"
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="outline" size="icon" className="w-6 h-6" onClick={addCell} title="Push"><Plus size={12} /></Button>
        <Button variant="outline" size="icon" className="w-6 h-6" onClick={removeCell} disabled={cells.length <= 0} title="Pop"><Minus size={12} /></Button>
      </div>
    </div>
  );

  const renderMatrix = () => (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        <div className="border-2 border-primary rounded-sm bg-background flex flex-col">
          {matrix.map((row, ri) => (
            <div key={ri} className="flex border-b-2 last:border-b-0 border-primary">
              {row.map((val, ci) => (
                <Input
                  key={ci}
                  value={val}
                  onChange={(e) => updateMatrixCell(ri, ci, e.target.value)}
                  className="w-10 h-10 text-center border-none border-r-2 last:border-r-0 border-primary rounded-none focus-visible:ring-0 p-0 font-mono"
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <Button variant="outline" size="icon" className="w-6 h-6" onClick={addCol} title="Add Column"><Plus size={12} /></Button>
          <Button variant="outline" size="icon" className="w-6 h-6" onClick={removeCol} disabled={matrix[0]?.length <= 1}><Minus size={12} /></Button>
        </div>
      </div>
      <div className="flex gap-1 w-full justify-start">
        <Button variant="outline" size="icon" className="w-6 h-6" onClick={addRow} title="Add Row"><Plus size={12} /></Button>
        <Button variant="outline" size="icon" className="w-6 h-6" onClick={removeRow} disabled={matrix.length <= 1}><Minus size={12} /></Button>
      </div>
    </div>
  );

  return (
    <NodeWrapper
      nodeId={id}
      color={data.color}
      emoji={data.emoji}
      shape="rectangle"
      isEditing={false}
      onIsEdit={() => {}}
      onDelete={data.onDelete}
    >
      <div className="p-4 flex flex-col items-center justify-center cursor-default">
        {data.text && <div className="mb-2 font-semibold text-sm">{data.text}</div>}
        {data.dsaType === 'array' && renderArray()}
        {data.dsaType === 'linkedlist' && renderLinkedList()}
        {data.dsaType === 'stack' && renderStack()}
        {(data.dsaType === 'queue') && renderArray()}
        {data.dsaType === 'matrix' && renderMatrix()}
      </div>
    </NodeWrapper>
  );
};
