"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";

interface FileNodeData extends Record<string, unknown> {
  label?: string;
  fileType?: string;

  selected?: boolean;
  dependency?: boolean;
  dependent?: boolean;
  impact?: boolean;
  cycle?: boolean;

  dimmed?: boolean;
  isolated?: boolean;
}

type FileNodeType = Node<FileNodeData, "file">;

// ==================================================
// HELPERS
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

function getFileType(path: string) {
  const fileName = path.replace(/\\/g, "/").split("/").pop() ?? path;

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
      return "bg-fuchsia-400";
    default:
      return "bg-zinc-500";
  }
}

// ==================================================
// FILE NODE
// ==================================================

function FileNode({ data }: NodeProps<FileNodeType>) {
  const label = String(data?.label ?? "Unknown file");

  const selected = data?.selected === true;
  const dimmed = data?.dimmed === true;
  const isolated = data?.isolated === true;
  const dependency = data?.dependency === true;
  const dependent = data?.dependent === true;
  const impact = data?.impact === true;
  const cycle = data?.cycle === true;

  const fileName = getFileName(label);
  const directory = getDirectory(label);

  const fileType = typeof data?.fileType === "string" ? data.fileType : getFileType(label);
  const typeColor = getTypeColor(fileType);

  const borderState = selected
    ? "border-zinc-300 bg-[#1d1d22] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.35)]"
    : cycle
      ? "border-amber-400/80 bg-[#211a0e] shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_10px_30px_rgba(245,158,11,0.08)]"
      : dependency
        ? "border-sky-400/45 bg-[#111c27]"
        : dependent
          ? "border-violet-400/45 bg-[#191426]"
          : impact
            ? "border-rose-400/45 bg-[#24151b]"
            : "border-zinc-800 bg-[#151517]";

  return (
    <div
      className={`
        group
        relative
        w-[280px]
        overflow-hidden
        rounded-xl
        border
        px-3.5
        py-3

        ${borderState}

        transition-[border-color,background-color,opacity]
        duration-150
        ease-out

        ${dimmed ? "opacity-20" : "opacity-100"}

        hover:border-zinc-600
        hover:bg-[#18181b]
      `}
    >
      {/* TARGET HANDLE */}

      <Handle
        type="target"
        position={Position.Top}
        className="
          !h-1.5
          !w-1.5
          !border-0
          !bg-zinc-500
          opacity-0
          group-hover:opacity-100
        "
      />

      {/* CONTENT */}

      <div className="flex min-w-0 items-center gap-3">
        {/* FILE DOT */}

        <span
          className={`
            h-2
            w-2
            shrink-0
            rounded-full
            ${typeColor}
            ${selected || cycle ? "shadow-[0_0_10px_currentColor]" : ""}
          `}
        />

        {/* FILE INFORMATION */}

        <div className="min-w-0 flex-1">
          <div
            title={label}
            className={`
              truncate
              text-[13px]
              font-medium
              leading-5
              tracking-tight
              ${selected ? "text-zinc-50" : "text-zinc-200"}
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
                leading-4
                text-zinc-600
              "
            >
              {directory}
            </div>
          )}
        </div>

        {/* FILE TYPE */}

        <span
          className="
            shrink-0
            rounded-md
            border
            border-zinc-800
            bg-zinc-900
            px-1.5
            py-1
            text-[9px]
            font-medium
            tracking-wide
            text-zinc-500
          "
        >
          {fileType}
        </span>
      </div>

      {/* SOURCE HANDLE */}

      <Handle
        type="source"
        position={Position.Bottom}
        className="
          !h-1.5
          !w-1.5
          !border-0
          !bg-zinc-500
          opacity-0
          group-hover:opacity-100
        "
      />

      {/* ISOLATED */}

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

export default memo(FileNode);
