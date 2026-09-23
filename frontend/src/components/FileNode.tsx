"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

interface FileNodeData extends Record<string, unknown> {
  label?: string;
  fileType?: string;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
}

type FileNodeType = Node<FileNodeData, "file">;

function getFileName(path: string) {
  const normalized = path.replace(/\\/g, "/");
  return normalized.split("/").pop() ?? path;
}

function getDirectory(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");

  if (parts.length <= 1) {
    return "";
  }

  return parts.slice(0, -1).join("/");
}

function getFileType(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "ts":
      return "TS";

    case "tsx":
      return "TSX";

    case "js":
      return "JS";

    case "jsx":
      return "JSX";

    case "json":
      return "JSON";

    case "css":
    case "scss":
    case "sass":
      return "CSS";

    case "md":
      return "MD";

    default:
      return "FILE";
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case "TS":
    case "TSX":
      return "bg-blue-400";

    case "JS":
    case "JSX":
      return "bg-yellow-400";

    case "JSON":
      return "bg-emerald-400";

    case "CSS":
      return "bg-purple-400";

    case "MD":
      return "bg-zinc-400";

    default:
      return "bg-zinc-500";
  }
}

export default function FileNode({ data }: NodeProps<FileNodeType>) {
  const label = String(data?.label ?? "Unknown file");

  const selected = data?.selected === true;

  const highlighted = data?.highlighted === true;

  const dimmed = data?.dimmed === true;

  const fileName = getFileName(label);

  const directory = getDirectory(label);

  const fileType = typeof data?.fileType === "string" ? data.fileType : getFileType(label);

  const typeColor = getTypeColor(fileType);

  return (
    <div
      className={`
        group
        relative
        w-[240px]
        rounded-xl
        border
        bg-[#151517]
        px-3
        py-2.5
        shadow-sm
        transition-[border-color,box-shadow,opacity,background-color]
        duration-150

        ${selected ? "border-zinc-300 bg-[#1c1c1f] shadow-lg shadow-black/30" : highlighted ? "border-zinc-500 bg-[#18181b]" : "border-zinc-800"}

        ${dimmed ? "opacity-[0.72]" : "opacity-100"}

        hover:border-zinc-600
        hover:bg-[#19191c]
      `}
    >
      {/* Target */}

      <Handle
        type="target"
        position={Position.Top}
        className="
          !h-1.5
          !w-1.5
          !border-0
          !bg-zinc-500
          opacity-0
          transition-opacity
          group-hover:opacity-100
        "
      />

      <div className="flex items-center gap-2.5">
        {/* File type indicator */}

        <span
          className={`
            h-2
            w-2
            shrink-0
            rounded-full
            ${typeColor}
          `}
        />

        {/* File information */}

        <div className="min-w-0 flex-1">
          <div
            className={`
              truncate
              text-[13px]
              font-medium
              leading-5
              ${selected ? "text-zinc-50" : highlighted ? "text-zinc-200" : "text-zinc-300"}
            `}
            title={label}
          >
            {fileName}
          </div>

          {directory && (
            <div
              className="
                mt-0.5
                truncate
                text-[10px]
                leading-4
                text-zinc-600
              "
              title={directory}
            >
              {directory}
            </div>
          )}
        </div>

        {/* Type */}

        <span
          className="
            shrink-0
            rounded-md
            border
            border-zinc-800
            bg-zinc-900
            px-1.5
            py-0.5
            text-[9px]
            font-medium
            tracking-wide
            text-zinc-500
          "
        >
          {fileType}
        </span>
      </div>

      {/* Source */}

      <Handle
        type="source"
        position={Position.Bottom}
        className="
          !h-1.5
          !w-1.5
          !border-0
          !bg-zinc-500
          opacity-0
          transition-opacity
          group-hover:opacity-100
        "
      />
    </div>
  );
}
