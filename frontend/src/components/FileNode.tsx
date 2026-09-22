"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

export type FileNodeData = {
  label: string;
};

export type FileNodeType = Node<FileNodeData, "file">;

export default function FileNode({ data, selected }: NodeProps<FileNodeType>) {
  return (
    <div
      className={`
        relative
        flex
        h-[58px]
        w-[190px]
        items-center
        justify-center
        rounded-lg
        border
        bg-[#111113]
        px-4
        transition
        duration-150
        ${
          selected
            ? "border-zinc-400 shadow-[0_0_0_2px_rgba(161,161,170,0.12)]"
            : "border-zinc-800"
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-2 !border-[#09090b] !bg-zinc-500"
      />

      <span className="max-w-full truncate text-sm font-medium text-zinc-200">
        {data.label}
      </span>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-2 !border-[#09090b] !bg-zinc-500"
      />
    </div>
  );
}