"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

interface GraphGroupNodeData extends Record<string, unknown> {
  label?: string;
  count?: number;
}

type GraphGroupNodeType = Node<GraphGroupNodeData, "group">;

export default function GraphGroupNode({ data }: NodeProps<GraphGroupNodeType>) {
  const label = String(data?.label ?? "Directory");
  const count = typeof data?.count === "number" ? data.count : 0;

  return (
    <div className="w-[260px] rounded-xl border border-zinc-700 bg-[#151517] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition hover:border-zinc-400">
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-zinc-500" />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-zinc-100" title={label}>
            {label}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">Directory group</div>
        </div>
        <span className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] tabular-nums text-zinc-300">
          {count} files
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-zinc-500" />
    </div>
  );
}
