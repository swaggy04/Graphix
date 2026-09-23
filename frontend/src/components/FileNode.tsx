"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

interface FileNodeData extends Record<string, unknown> {
  label?: string;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
}

type FileNodeType = Node<FileNodeData, "file">;

export default function FileNode({ data }: NodeProps<FileNodeType>) {
  const selected = data.selected === true;
  const highlighted = data.highlighted === true;
  const dimmed = data.dimmed === true;

  return (
    <div
      className={`
        relative
        min-w-45
        rounded-lg
        border
        bg-zinc-950
        px-5
        py-3
        transition-all
        duration-200

        ${
          selected
            ? "border-zinc-200 shadow-lg shadow-white/10"
            : highlighted
              ? "border-zinc-500"
              : "border-zinc-800"
        }

        ${dimmed ? "opacity-25" : "opacity-100"}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-2 w-2 border-0 bg-zinc-500"
      />

      <div className="text-center text-sm font-medium text-zinc-200">
        {data.label ?? "Unknown file"}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="h-2 w-2 border-0 bg-zinc-500"
      />
    </div>
  );
}
