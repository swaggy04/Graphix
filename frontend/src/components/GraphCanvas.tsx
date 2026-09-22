"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { useState } from "react";

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
}

export default function GraphCanvas({ nodes, edges }: GraphCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  return (
    <div className="relative h-screen w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        className="react-flow-wrapper"
        onNodeClick={handleNodeClick}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <div className="absolute left-4 top-4 z-10 rounded-md border bg-white px-4 py-2 text-sm text-gray-900 shadow">
        Selected: {selectedNode ? selectedNode.id : "None"}
      </div>
    </div>
  );
}
