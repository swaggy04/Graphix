"use client";

import { useCallback, useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, useReactFlow, type Edge, type Node } from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import FileNode from "./FileNode";

// ==================================================
// TYPES
// ==================================================

interface GraphStats {
  totalFiles: number;
  parsedFiles: number;
  failedFiles: number;
  resolvedImports: number;
  unresolvedImports: number;
  relativeImports: number;
  packageImports: number;
  builtinImports: number;
  unresolvedImportSpecifiers?: string[];
  repositoryUrl?: string;
  analysisId?: string;
}

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];

  analysisId: string | null;
  stats: GraphStats | null;

  repositoryUrl: string;
  setRepositoryUrl: React.Dispatch<React.SetStateAction<string>>;

  onAnalyze: () => Promise<void>;
  analyzing: boolean;
}

interface FileAnalysis {
  file: string;

  dependencies: {
    direct: string[];
    transitive: string[];
  };

  dependents: {
    direct: string[];
    transitive: string[];
  };

  impact: {
    affectedFiles: string[];
  };
}

interface FileNodeData extends Record<string, unknown> {
  label?: string;
  fileType?: string;

  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  isolated?: boolean;
}

const nodeTypes = {
  file: FileNode,
};

// ==================================================
// GRAPH CANVAS
// ==================================================

export default function GraphCanvas({ nodes, edges, analysisId, stats, repositoryUrl, setRepositoryUrl, onAnalyze, analyzing }: GraphCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);

  const [loading, setLoading] = useState(false);
  const [showIsolated, setShowIsolated] = useState(true);

  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // File search
  const [search, setSearch] = useState("");

  const { setCenter, getNode } = useReactFlow();

  // ==================================================
  // COUNTS
  // ==================================================

  const isolatedCount = useMemo(() => {
    return nodes.filter((node) => {
      const data = node.data as FileNodeData | undefined;

      return data?.isolated === true;
    }).length;
  }, [nodes]);

  const connectedCount = nodes.length - isolatedCount;

  // ==================================================
  // VISIBLE GRAPH
  // ==================================================

  const visibleNodes = useMemo(() => {
    if (showIsolated) {
      return nodes;
    }

    return nodes.filter((node) => {
      const data = node.data as FileNodeData | undefined;

      return data?.isolated !== true;
    });
  }, [nodes, showIsolated]);

  const visibleNodeIds = useMemo(() => {
    return new Set(visibleNodes.map((node) => node.id));
  }, [visibleNodes]);

  const visibleEdges = useMemo(() => {
    if (showIsolated) {
      return edges;
    }

    return edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  }, [edges, showIsolated, visibleNodeIds]);

  // ==================================================
  // SEARCHED NODES
  // ==================================================

  const searchedNodeIds = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return new Set<string>();
    }

    const result = new Set<string>();

    for (const node of visibleNodes) {
      const data = node.data as FileNodeData;

      const label = String(data?.label ?? "");
      const id = node.id;

      const matches = label.toLowerCase().includes(query) || id.toLowerCase().includes(query);

      if (matches) {
        result.add(node.id);
      }
    }

    return result;
  }, [search, visibleNodes]);

  // ==================================================
  // RELATIONSHIP IDS
  // ==================================================

  const dependencyIds = useMemo(() => {
    if (!fileAnalysis) {
      return new Set<string>();
    }

    return new Set(fileAnalysis.dependencies.direct);
  }, [fileAnalysis]);

  const dependentIds = useMemo(() => {
    if (!fileAnalysis) {
      return new Set<string>();
    }

    return new Set(fileAnalysis.dependents.direct);
  }, [fileAnalysis]);

  const highlightedNodeIds = useMemo(() => {
    if (!selectedNode || !fileAnalysis) {
      return new Set<string>();
    }

    return new Set([selectedNode.id, ...fileAnalysis.dependencies.direct, ...fileAnalysis.dependents.direct]);
  }, [selectedNode, fileAnalysis]);

  // ==================================================
  // DISPLAY NODES
  // ==================================================

  const displayNodes = useMemo(() => {
    return visibleNodes.map((node) => {
      const isSelected = node.id === selectedNode?.id;

      const isRelationshipNode = highlightedNodeIds.has(node.id);

      const isSearchMatch = searchedNodeIds.has(node.id);

      const hasSearch = search.trim().length > 0;

      let opacity = 1;

      // Search is active
      if (hasSearch) {
        opacity = isSearchMatch ? 1 : 0.18;
      }

      // File relationship selection is active
      if (selectedNode && fileAnalysis) {
        opacity = isRelationshipNode ? 1 : 0.18;
      }

      // Search + relationship selection
      if (hasSearch && selectedNode && fileAnalysis) {
        opacity = isSearchMatch && isRelationshipNode ? 1 : 0.18;
      }

      return {
        ...node,

        data: {
          ...node.data,

          selected: isSelected,

          highlighted: isRelationshipNode || isSearchMatch,

          dimmed: opacity < 1,
        },

        style: {
          ...node.style,

          opacity,

          zIndex: isSelected ? 50 : isRelationshipNode || isSearchMatch ? 20 : 1,
        },
      };
    });
  }, [visibleNodes, selectedNode, fileAnalysis, highlightedNodeIds, searchedNodeIds, search]);

  // ==================================================
  // DISPLAY EDGES
  // ==================================================

  const displayEdges = useMemo(() => {
    return visibleEdges.map((edge) => {
      if (!selectedNode || !fileAnalysis) {
        return {
          ...edge,

          animated: false,

          style: {
            ...edge.style,

            stroke: "#52525b",
            strokeWidth: 1,
            opacity: 0.45,
          },
        };
      }

      const isDependency = edge.source === selectedNode.id && dependencyIds.has(edge.target);

      const isDependent = edge.target === selectedNode.id && dependentIds.has(edge.source);

      if (isDependency || isDependent) {
        return {
          ...edge,

          animated: true,

          style: {
            ...edge.style,

            stroke: "#71717a",
            strokeWidth: 1.5,
            opacity: 0.9,
          },
        };
      }

      return {
        ...edge,

        animated: false,

        style: {
          ...edge.style,

          stroke: "#27272a",
          strokeWidth: 0.8,
          opacity: 0.12,
        },
      };
    });
  }, [visibleEdges, selectedNode, fileAnalysis, dependencyIds, dependentIds]);

  // ==================================================
  // SELECT FILE
  // ==================================================

  const selectFile = useCallback(
    async (filePath: string) => {
      if (!analysisId) {
        return;
      }

      setAnalysisError(null);
      setFileAnalysis(null);

      const targetNode = getNode(filePath);

      if (targetNode) {
        setSelectedNode(targetNode);

        const width = targetNode.measured?.width ?? 240;
        const height = targetNode.measured?.height ?? 70;

        const centerX = targetNode.position.x + width / 2;

        const centerY = targetNode.position.y + height / 2;

        setCenter(centerX, centerY, {
          zoom: 1.15,
          duration: 450,
        });
      } else {
        setSelectedNode({
          id: filePath,

          position: {
            x: 0,
            y: 0,
          },

          data: {
            label: getFileName(filePath),
          },
        });
      }

      setLoading(true);

      try {
        const encodedFilePath = encodeURIComponent(filePath);

        const response = await fetch(`http://localhost:3001/api/analyze/${analysisId}/file/${encodedFilePath}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch analysis for ${filePath}`);
        }

        const data: FileAnalysis = await response.json();

        setFileAnalysis(data);
      } catch (error) {
        console.error("File analysis failed:", error);

        setAnalysisError(error instanceof Error ? error.message : "Failed to analyze file");
      } finally {
        setLoading(false);
      }
    },
    [analysisId, getNode, setCenter],
  );

  // ==================================================
  // NODE CLICK
  // ==================================================

  const handleNodeClick = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      await selectFile(node.id);
    },
    [selectFile],
  );

  // ==================================================
  // SEARCH FILE
  // ==================================================

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      const firstMatch = visibleNodes.find((node) => {
        const data = node.data as FileNodeData;

        const label = String(data?.label ?? "");

        const query = search.trim().toLowerCase();

        return label.toLowerCase().includes(query) || node.id.toLowerCase().includes(query);
      });

      if (firstMatch) {
        void selectFile(firstMatch.id);
      }
    },
    [search, visibleNodes, selectFile],
  );

  // ==================================================
  // PANE CLICK
  // ==================================================

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setFileAnalysis(null);
    setAnalysisError(null);
  }, []);

  // ==================================================
  // ANALYZE
  // ==================================================

  const handleAnalyze = useCallback(() => {
    if (analyzing) {
      return;
    }

    return onAnalyze();
  }, [analyzing, onAnalyze]);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#09090b]">
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.18,
          maxZoom: 1.05,
          minZoom: 0.08,
        }}
        minZoom={0.04}
        maxZoom={2}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
        proOptions={{
          hideAttribution: false,
        }}
      >
        {/* BACKGROUND */}

        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#242428" />

        {/* ==================================================
            TOP BAR
        ================================================== */}

        <Panel position="top-center">
          <div
            className="
              flex
              items-center
              gap-2
              rounded-2xl
              border
              border-zinc-800/80
              bg-[#111114]/95
              p-1.5
              shadow-xl
              backdrop-blur-xl
            "
          >
            {/* BRAND */}

            <div className="hidden items-center gap-2 px-3 sm:flex">
              <div
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-zinc-700
                  bg-zinc-900
                  text-xs
                  font-semibold
                  text-zinc-200
                "
              >
                G
              </div>

              <span className="text-sm font-semibold text-zinc-200">Grapix</span>
            </div>

            <div className="h-5 w-px bg-zinc-800" />

            {/* SEARCH */}

            <div
              className="
                flex
                w-[min(28vw,320px)]
                items-center
                gap-2
                rounded-xl
                border
                border-zinc-800
                bg-[#09090b]
                px-3
              "
            >
              <span className="text-zinc-600">⌕</span>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search files..."
                className="
                  h-9
                  min-w-0
                  flex-1
                  bg-transparent
                  text-xs
                  text-zinc-200
                  outline-none
                  placeholder:text-zinc-600
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="
                    text-xs
                    text-zinc-600
                    hover:text-zinc-300
                  "
                >
                  ×
                </button>
              )}
            </div>

            {/* REPOSITORY */}

            <div
              className="
                flex
                w-[min(35vw,420px)]
                items-center
                gap-2
                rounded-xl
                border
                border-zinc-800
                bg-[#09090b]
                px-3
              "
            >
              <input
                type="text"
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !analyzing) {
                    void handleAnalyze();
                  }
                }}
                placeholder="github.com/owner/repository"
                disabled={analyzing}
                className="
                  h-9
                  min-w-0
                  flex-1
                  bg-transparent
                  text-xs
                  text-zinc-200
                  outline-none
                  placeholder:text-zinc-600
                  disabled:opacity-50
                "
              />
            </div>

            {/* ANALYZE */}

            <button
              onClick={() => void handleAnalyze()}
              disabled={analyzing}
              className="
                h-9
                rounded-xl
                bg-zinc-100
                px-4
                text-xs
                font-semibold
                text-zinc-950
                transition
                hover:bg-white
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {analyzing ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </Panel>

        {/* ==================================================
            STATS
        ================================================== */}

        {nodes.length > 0 && (
          <Panel position="top-left">
            <div className="space-y-2">
              <div
                className="
                  flex
                  items-center
                  gap-1
                  rounded-xl
                  border
                  border-zinc-800/80
                  bg-[#111114]/95
                  p-1
                  shadow-lg
                  backdrop-blur-xl
                "
              >
                <Stat label="Files" value={stats?.totalFiles ?? nodes.length} />

                <div className="h-5 w-px bg-zinc-800" />

                <Stat label="Connected" value={connectedCount} />

                <div className="h-5 w-px bg-zinc-800" />

                <Stat label="Isolated" value={isolatedCount} />
              </div>
            </div>
          </Panel>
        )}

        {/* ==================================================
            VIEW SWITCHER
        ================================================== */}

        {nodes.length > 0 && isolatedCount > 0 && !selectedNode && (
          <Panel position="bottom-center">
            <div
              className="
                  flex
                  items-center
                  gap-1
                  rounded-xl
                  border
                  border-zinc-800/80
                  bg-[#111114]/95
                  p-1
                  shadow-xl
                "
            >
              <span className="px-2 text-[10px] uppercase tracking-wider text-zinc-600">View</span>

              <ViewButton active={!showIsolated} onClick={() => setShowIsolated(false)}>
                Connected
              </ViewButton>

              <ViewButton active={showIsolated} onClick={() => setShowIsolated(true)}>
                All files
              </ViewButton>
            </div>
          </Panel>
        )}

        {/* ==================================================
            CONTROLS
        ================================================== */}

        <Controls position="bottom-left" showInteractive={false} className="grapix-controls" />

        {/* ==================================================
            MINIMAP
        ================================================== */}

        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          className="grapix-minimap"
          bgColor="#111114"
          maskColor="rgba(9, 9, 11, 0.72)"
          nodeColor="#52525b"
          nodeStrokeColor="#71717a"
          nodeStrokeWidth={1}
        />

        {/* ==================================================
            FILE INSPECTOR
        ================================================== */}

        {selectedNode && (
          <Panel position="top-right">
            <FileInspector selectedNode={selectedNode} fileAnalysis={fileAnalysis} loading={loading} error={analysisError} onClose={handlePaneClick} onFileClick={selectFile} />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

// ==================================================
// STAT
// ==================================================

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2.5 py-1.5">
      <div className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">{label}</div>

      <div className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-300">{value.toLocaleString()}</div>
    </div>
  );
}

// ==================================================
// VIEW BUTTON
// ==================================================

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-lg
        px-3
        py-1.5
        text-[11px]
        font-medium
        transition

        ${active ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:text-zinc-300"}
      `}
    >
      {children}
    </button>
  );
}

// ==================================================
// FILE INSPECTOR
// ==================================================

function FileInspector({
  selectedNode,
  fileAnalysis,
  loading,
  error,
  onClose,
  onFileClick,
}: {
  selectedNode: Node;
  fileAnalysis: FileAnalysis | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onFileClick: (filePath: string) => void;
}) {
  return (
    <aside
      className="
        w-[360px]
        max-w-[calc(100vw-32px)]
        overflow-hidden
        rounded-2xl
        border
        border-zinc-800/90
        bg-[#111114]/96
        shadow-2xl
      "
    >
      {/* HEADER */}

      <div className="border-b border-zinc-800/80 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600">File inspector</div>

            <div className="break-all text-sm font-medium leading-5 text-zinc-100">{getFileName(selectedNode.id)}</div>

            <div className="mt-1 break-all text-[10px] leading-4 text-zinc-600">{selectedNode.id}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="
              flex
              h-7
              w-7
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-zinc-600
              hover:bg-zinc-800
              hover:text-zinc-300
            "
          >
            ×
          </button>
        </div>
      </div>

      {/* LOADING */}

      {loading && <div className="px-4 py-8 text-xs text-zinc-500">Analyzing dependency relationships...</div>}

      {/* ERROR */}

      {error && !loading && (
        <div className="border-b border-zinc-800/80 px-4 py-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-[10px] leading-4 text-zinc-400">{error}</div>
        </div>
      )}

      {/* ANALYSIS */}

      {fileAnalysis && !loading && (
        <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
          <AnalysisSection title="Dependencies" direct={fileAnalysis.dependencies.direct} transitive={fileAnalysis.dependencies.transitive} onFileClick={onFileClick} />

          <AnalysisSection title="Dependents" direct={fileAnalysis.dependents.direct} transitive={fileAnalysis.dependents.transitive} onFileClick={onFileClick} />

          {/* IMPACT */}

          <div className="border-t border-zinc-800/80 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-zinc-200">Impact</div>

                <div className="mt-0.5 text-[10px] text-zinc-600">Files affected by this module</div>
              </div>

              <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-medium tabular-nums text-zinc-500">{fileAnalysis.impact.affectedFiles.length}</span>
            </div>

            {fileAnalysis.impact.affectedFiles.length === 0 ? <EmptyText text="No affected files." /> : <FileList files={fileAnalysis.impact.affectedFiles} onFileClick={onFileClick} />}
          </div>
        </div>
      )}
    </aside>
  );
}

// ==================================================
// ANALYSIS SECTION
// ==================================================

function AnalysisSection({ title, direct, transitive, onFileClick }: { title: string; direct: string[]; transitive: string[]; onFileClick: (filePath: string) => void }) {
  const total = direct.length + transitive.length;

  return (
    <section className="border-b border-zinc-800/80 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-200">{title}</div>

          <div className="mt-0.5 text-[10px] text-zinc-600">Direct and transitive relationships</div>
        </div>

        <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-medium tabular-nums text-zinc-500">{total}</span>
      </div>

      {/* DIRECT */}

      <div>
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Direct</div>

        {direct.length === 0 ? <EmptyText text="None" /> : <FileList files={direct} onFileClick={onFileClick} />}
      </div>

      {/* TRANSITIVE */}

      <div className="mt-4">
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Transitive</div>

        {transitive.length === 0 ? <EmptyText text="None" /> : <FileList files={transitive} onFileClick={onFileClick} />}
      </div>
    </section>
  );
}

// ==================================================
// FILE LIST
// ==================================================

function FileList({ files, onFileClick }: { files: string[]; onFileClick: (filePath: string) => void }) {
  return (
    <div className="space-y-1">
      {files.map((file) => (
        <button
          key={file}
          type="button"
          title={`Open ${file}`}
          onClick={() => onFileClick(file)}
          className="
            block
            w-full
            rounded-lg
            border
            border-zinc-800/80
            bg-[#0c0c0f]
            px-2.5
            py-2
            text-left
            text-[10px]
            leading-4
            text-zinc-500
            transition
            hover:border-zinc-600
            hover:bg-zinc-900
            hover:text-zinc-200
          "
        >
          <span className="line-clamp-2 break-all">{file}</span>
        </button>
      ))}
    </div>
  );
}

// ==================================================
// EMPTY
// ==================================================

function EmptyText({ text }: { text: string }) {
  return <p className="text-[10px] text-zinc-700">{text}</p>;
}

// ==================================================
// FILE NAME
// ==================================================

function getFileName(path: string) {
  const normalized = path.replace(/\\/g, "/");

  return normalized.split("/").pop() ?? path;
}
