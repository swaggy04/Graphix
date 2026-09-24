"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

interface FileNodeData extends Record<string, unknown> {
  label?: string;
  fileType?: string;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  isolated?: boolean;
}

type FileNodeType = Node<FileNodeData, "file">;

// ==================================================
// PATH HELPERS
// ==================================================

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

// ==================================================
// FILE TYPE
// ==================================================

function getFileType(path: string) {
  const normalized = path.replace(/\\/g, "/");

  const fileName = normalized.split("/").pop() ?? normalized;

  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;

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
    case "mdx":
      return "MD";

    case "html":
      return "HTML";

    case "yaml":
    case "yml":
      return "YAML";

    default:
      return "FILE";
  }
}

// ==================================================
// FILE TYPE COLOR
// ==================================================

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

    case "HTML":
      return "bg-orange-400";

    case "YAML":
      return "bg-cyan-400";

    default:
      return "bg-zinc-500";
  }
}

// ==================================================
// FILE NODE
// ==================================================

export default function FileNode({ data }: NodeProps<FileNodeType>) {
  const label = String(data?.label ?? "Unknown file");

  const selected = data?.selected === true;

  const highlighted = data?.highlighted === true;

  const dimmed = data?.dimmed === true;

  const isolated = data?.isolated === true;

  const fileName = getFileName(label);

  const directory = getDirectory(label);

  const fileType = typeof data?.fileType === "string" ? data.fileType : getFileType(label);

  const typeColor = getTypeColor(fileType);

  // ==================================================
  // STATE
  // ==================================================

  const nodeState = selected
    ? "border-zinc-400 bg-[#1b1b1f] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.28)]"
    : highlighted
      ? "border-zinc-600 bg-[#18181b]"
      : "border-zinc-800/90 bg-[#141416]";

  const textState = selected ? "text-zinc-50" : highlighted ? "text-zinc-200" : "text-zinc-300";

  return (
    <div
      className={`
        group
        relative
        w-[240px]
        overflow-hidden
        rounded-lg
        border
        px-3.5
        py-2.5

        transition-[border-color,background-color,box-shadow,opacity]
        duration-150
        ease-out

        ${nodeState}

        ${dimmed ? "opacity-45" : "opacity-100"}

        hover:border-zinc-600
        hover:bg-[#18181b]
        hover:shadow-[0_10px_30px_rgba(0,0,0,0.22)]
      `}
    >
      {/* ==================================================
          TARGET HANDLE
      ================================================== */}

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
          duration-150
          group-hover:opacity-100
        "
      />

      {/* ==================================================
          CONTENT
      ================================================== */}

      <div className="flex min-w-0 items-center gap-3">
        {/* ----------------------------------------------
            TYPE INDICATOR
        ---------------------------------------------- */}

        <span
          className={`
            h-1.5
            w-1.5
            shrink-0
            rounded-full
            ${typeColor}

            ${selected ? "shadow-[0_0_7px_currentColor]" : ""}
          `}
        />

        {/* ----------------------------------------------
            FILE INFORMATION
        ---------------------------------------------- */}

        <div className="min-w-0 flex-1">
          <div
            title={label}
            className={`
              truncate
              text-[13px]
              font-medium
              leading-[18px]
              tracking-[-0.01em]

              ${textState}
            `}
          >
            {fileName}
          </div>

          {directory && (
            <div
              title={directory}
              className="
                mt-0.5
                truncate
                text-[10px]
                leading-[15px]
                text-zinc-600
              "
            >
              {directory}
            </div>
          )}
        </div>

        {/* ----------------------------------------------
            FILE TYPE
        ---------------------------------------------- */}

        <span
          className={`
            shrink-0
            rounded
            border
            px-1.5
            py-0.5
            text-[9px]
            font-semibold
            leading-none
            tracking-[0.04em]

            ${selected ? "border-zinc-700 bg-zinc-800/80 text-zinc-400" : "border-zinc-800 bg-zinc-900/80 text-zinc-600"}
          `}
        >
          {fileType}
        </span>
      </div>

      {/* ==================================================
          SOURCE HANDLE
      ================================================== */}

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
          duration-150
          group-hover:opacity-100
        "
      />

      {/* ==================================================
          SELECTED ACCENT
      ================================================== */}

      {selected && (
        <div
          className="
            pointer-events-none
            absolute
            bottom-2
            left-0
            top-2
            w-px
            rounded-full
            bg-zinc-300
          "
        />
      )}

      {/* ==================================================
          ISOLATED INDICATOR
      ================================================== */}

      {isolated && !selected && (
        <div
          className="
            pointer-events-none
            absolute
            right-0
            top-0
            h-full
            w-px
            bg-zinc-800
          "
        />
      )}
    </div>
  );
}
