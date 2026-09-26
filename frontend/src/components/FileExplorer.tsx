"use client";

import { useMemo, useState } from "react";
import type { Node } from "@xyflow/react";

interface FileExplorerProps {
  nodes: Node[];
  selectedFile: string | null;
  onFileClick: (filePath: string) => void;
}

export default function FileExplorer({
  nodes,
  selectedFile,
  onFileClick,
}: FileExplorerProps) {
  const [search, setSearch] = useState("");

  /*
   * We don't modify the original React Flow nodes.
   *
   * We only extract the file paths that we need.
   */
  const files = useMemo(() => {
    return nodes.map((node) => node.id);
  }, [nodes]);

  /*
   * Search happens in memory.
   *
   * For a few thousand files this is completely fine.
   */
  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return files;
    }

    return files.filter((file) =>
      file.toLowerCase().includes(query),
    );
  }, [files, search]);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-zinc-800 bg-[#0c0c0f]">
      {/* HEADER */}

      <div className="border-b border-zinc-800 p-3">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Files
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search files..."
          className="
            h-8
            w-full
            rounded-lg
            border
            border-zinc-800
            bg-[#09090b]
            px-2.5
            text-xs
            text-zinc-300
            outline-none
            placeholder:text-zinc-700
            focus:border-zinc-700
          "
        />
      </div>

      {/* FILE LIST */}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredFiles.map((file) => {
          const fileName = getFileName(file);

          const isSelected = selectedFile === file;

          return (
            <button
              key={file}
              type="button"
              onClick={() => onFileClick(file)}
              className={`
                flex
                w-full
                items-center
                gap-2
                rounded-md
                px-2
                py-1.5
                text-left
                text-[11px]
                transition

                ${
                  isSelected
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                }
              `}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />

              <span className="min-w-0 flex-1 truncate">
                {fileName}
              </span>
            </button>
          );
        })}

        {filteredFiles.length === 0 && (
          <div className="px-2 py-6 text-center text-[10px] text-zinc-700">
            No files found
          </div>
        )}
      </div>

      {/* FOOTER */}

      <div className="border-t border-zinc-800 px-3 py-2">
        <span className="text-[10px] text-zinc-700">
          {filteredFiles.length} files
        </span>
      </div>
    </aside>
  );
}

/*
 * Converts:
 *
 * src/analyzer/parser.ts
 *
 * into:
 *
 * parser.ts
 */
function getFileName(path: string) {
  const normalizedPath = path.replace(/\\/g, "/");

  const parts = normalizedPath.split("/");

  return parts[parts.length - 1] ?? path;
}
