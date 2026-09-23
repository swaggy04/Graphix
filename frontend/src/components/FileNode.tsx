"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function FileNode({ data }: NodeProps) {
  return (
    <div className="relative min-w-45 rounded-lg border border-zinc-800 bg-zinc-950 px-5 py-3">
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border-0 bg-zinc-500"
      />

      <div className="text-center text-sm font-medium text-zinc-200">
        {String(data.label)}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border-0 bg-zinc-500"
      />
    </div>
  );
}
