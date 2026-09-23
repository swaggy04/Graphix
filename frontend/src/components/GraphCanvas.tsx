"use client";

import { useCallback, useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, ReactFlowProvider, type Edge, type Node } from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import FileNode from "./FileNode";

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  analysisId: string | null;

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
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  isolated?: boolean;
}

const nodeTypes = {
  file: FileNode,
};

export default function GraphCanvas({ nodes, edges, analysisId, repositoryUrl, setRepositoryUrl, onAnalyze, analyzing }: GraphCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [showIsolated, setShowIsolated] = useState(true);

  // ==================================================
  // REPOSITORY STATS
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

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    if (showIsolated) {
      return edges;
    }

    return edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target));
  }, [edges, showIsolated, visibleNodeIds]);

  // ==================================================
  // HIGHLIGHTED RELATIONSHIPS
  // ==================================================

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
    if (!selectedNode || !fileAnalysis) {
      return visibleNodes.map((node) => ({
        ...node,

        data: {
          ...node.data,
          selected: false,
          highlighted: false,
          dimmed: false,
        },
      }));
    }

    return visibleNodes.map((node) => {
      const selected = node.id === selectedNode.id;
      const highlighted = highlightedNodeIds.has(node.id);

      return {
        ...node,

        data: {
          ...node.data,
          selected,
          highlighted,
          dimmed: !highlighted,
        },

        style: {
          ...node.style,
          zIndex: selected ? 20 : highlighted ? 10 : 1,
        },
      };
    });
  }, [visibleNodes, selectedNode, fileAnalysis, highlightedNodeIds]);

  // ==================================================
  // DISPLAY EDGES
  // ==================================================

  const displayEdges = useMemo(() => {
    if (!selectedNode) {
      return visibleEdges.map((edge) => ({
        ...edge,

        animated: false,

        style: {
          ...edge.style,
          stroke: "#3f3f46",
          strokeWidth: 1.2,
          opacity: 0.55,
        },
      }));
    }

    return visibleEdges.map((edge) => {
      const connected = edge.source === selectedNode.id || edge.target === selectedNode.id;

      return {
        ...edge,

        animated: false,

        style: {
          ...edge.style,
          stroke: connected ? "#a1a1aa" : "#27272a",
          strokeWidth: connected ? 2 : 1,
          opacity: connected ? 0.95 : 0.35,
        },
      };
    });
  }, [visibleEdges, selectedNode]);

  // ==================================================
  // NODE CLICK
  // ==================================================

  const handleNodeClick = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      if (!analysisId) {
        return;
      }

      setSelectedNode(node);
      setFileAnalysis(null);
      setLoading(true);

      try {
        const encodedFilePath = encodeURIComponent(node.id);

        const response = await fetch(`http://localhost:3001/api/analyze/${analysisId}/file/${encodedFilePath}`);

        if (!response.ok) {
          throw new Error("Failed to fetch file analysis");
        }

        const data: FileAnalysis = await response.json();

        setFileAnalysis(data);
      } catch (error) {
        console.error("File analysis failed:", error);
      } finally {
        setLoading(false);
      }
    },
    [analysisId],
  );

  // ==================================================
  // PANE CLICK
  // ==================================================

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setFileAnalysis(null);
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

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full overflow-hidden bg-[#09090b]">
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.16,
            maxZoom: 1.1,
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
          {/* ==================================================
              BACKGROUND
          ================================================== */}

          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#242428" />

          {/* ==================================================
              TOP HEADER
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
                bg-[#111114]/90
                p-1.5
                shadow-[0_12px_40px_rgba(0,0,0,0.35)]
                backdrop-blur-xl
              "
            >
              {/* Brand */}

              <div
                className="
                  hidden
                  items-center
                  gap-2
                  px-3
                  sm:flex
                "
              >
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

                <span
                  className="
                    text-sm
                    font-semibold
                    tracking-tight
                    text-zinc-200
                  "
                >
                  Grapix
                </span>
              </div>

              <div className="h-5 w-px bg-zinc-800" />

              {/* Repository input */}

              <div
                className="
                  flex
                  w-[min(55vw,480px)]
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-zinc-800
                  bg-[#09090b]
                  px-3
                "
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-zinc-600">
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" strokeWidth="1.5" />

                  <path d="m8 9 2.5 3L8 15M12.5 15H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

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

              {/* Analyze */}

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
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {analyzing ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          </Panel>

          {/* ==================================================
              GRAPH STATUS
          ================================================== */}

          {nodes.length > 0 && (
            <Panel position="top-left">
              <div
                className="
                  flex
                  items-center
                  gap-1
                  rounded-xl
                  border
                  border-zinc-800/80
                  bg-[#111114]/85
                  p-1
                  shadow-lg
                  backdrop-blur-xl
                "
              >
                <Stat label="Files" value={nodes.length} />

                <div className="h-5 w-px bg-zinc-800" />

                <Stat label="Connected" value={connectedCount} />

                <div className="h-5 w-px bg-zinc-800" />

                <Stat label="Isolated" value={isolatedCount} />
              </div>
            </Panel>
          )}

          {/* ==================================================
              VIEW SWITCHER
          ================================================== */}

          {nodes.length > 0 && isolatedCount > 0 && (
            <Panel position="bottom-center">
              <div
                className="
                  flex
                  items-center
                  gap-1
                  rounded-xl
                  border
                  border-zinc-800/80
                  bg-[#111114]/90
                  p-1
                  shadow-xl
                  backdrop-blur-xl
                "
              >
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
              <FileInspector selectedNode={selectedNode} fileAnalysis={fileAnalysis} loading={loading} onClose={handlePaneClick} />
            </Panel>
          )}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
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
      onClick={onClick}
      className={`
        rounded-lg
        px-3
        py-1.5
        text-[11px]
        font-medium
        transition

        ${active ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-600 hover:text-zinc-300"}
      `}
    >
      {children}
    </button>
  );
}

// ==================================================
// FILE INSPECTOR
// ==================================================

function FileInspector({ selectedNode, fileAnalysis, loading, onClose }: { selectedNode: Node; fileAnalysis: FileAnalysis | null; loading: boolean; onClose: () => void }) {
  return (
    <aside
      className="
        w-[360px]
        max-w-[calc(100vw-32px)]
        overflow-hidden
        rounded-2xl
        border
        border-zinc-800/90
        bg-[#111114]/95
        shadow-[0_20px_70px_rgba(0,0,0,0.45)]
        backdrop-blur-xl
      "
    >
      {/* Header */}

      <div
        className="
          border-b
          border-zinc-800/80
          px-4
          py-3.5
        "
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className="
                mb-1
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-zinc-600
              "
            >
              File inspector
            </div>

            <div
              className="
                break-all
                text-sm
                font-medium
                leading-5
                text-zinc-100
              "
            >
              {getFileName(selectedNode.id)}
            </div>

            <div
              className="
                mt-1
                break-all
                text-[10px]
                leading-4
                text-zinc-600
              "
            >
              {selectedNode.id}
            </div>
          </div>

          <button
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
              transition
              hover:bg-zinc-800
              hover:text-zinc-300
            "
          >
            ×
          </button>
        </div>
      </div>

      {/* Loading */}

      {loading && (
        <div className="px-4 py-8">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
            Analyzing dependency relationships...
          </div>
        </div>
      )}

      {/* Analysis */}

      {fileAnalysis && !loading && (
        <div
          className="
            max-h-[calc(100vh-180px)]
            overflow-y-auto
            grapix-inspector-scroll
          "
        >
          <AnalysisSection title="Dependencies" direct={fileAnalysis.dependencies.direct} transitive={fileAnalysis.dependencies.transitive} />

          <AnalysisSection title="Dependents" direct={fileAnalysis.dependents.direct} transitive={fileAnalysis.dependents.transitive} />

          <div className="border-t border-zinc-800/80 px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-zinc-200">Impact</div>

                <div className="mt-0.5 text-[10px] text-zinc-600">Files affected by this module</div>
              </div>

              <span
                className="
                  rounded-md
                  border
                  border-zinc-800
                  bg-zinc-900
                  px-2
                  py-1
                  text-[10px]
                  font-medium
                  tabular-nums
                  text-zinc-500
                "
              >
                {fileAnalysis.impact.affectedFiles.length}
              </span>
            </div>

            {fileAnalysis.impact.affectedFiles.length === 0 ? <EmptyText text="No affected files." /> : <FileList files={fileAnalysis.impact.affectedFiles} />}
          </div>
        </div>
      )}
    </aside>
  );
}

// ==================================================
// ANALYSIS SECTION
// ==================================================

function AnalysisSection({ title, direct, transitive }: { title: string; direct: string[]; transitive: string[] }) {
  const total = direct.length + transitive.length;

  return (
    <section className="border-b border-zinc-800/80 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-200">{title}</div>

          <div className="mt-0.5 text-[10px] text-zinc-600">Direct and transitive relationships</div>
        </div>

        <span
          className="
            rounded-md
            border
            border-zinc-800
            bg-zinc-900
            px-2
            py-1
            text-[10px]
            font-medium
            tabular-nums
            text-zinc-500
          "
        >
          {total}
        </span>
      </div>

      <div>
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Direct</div>

        {direct.length === 0 ? <EmptyText text="None" /> : <FileList files={direct} />}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Transitive</div>

        {transitive.length === 0 ? <EmptyText text="None" /> : <FileList files={transitive} />}
      </div>
    </section>
  );
}

// ==================================================
// FILE LIST
// ==================================================

function FileList({ files }: { files: string[] }) {
  return (
    <div className="space-y-1">
      {files.map((file) => (
        <div
          key={file}
          title={file}
          className="
            rounded-lg
            border
            border-zinc-800/80
            bg-[#0c0c0f]
            px-2.5
            py-2
            text-[10px]
            leading-4
            text-zinc-500
            transition
            hover:border-zinc-700
            hover:bg-zinc-900
            hover:text-zinc-300
          "
        >
          <span className="line-clamp-2 break-all">{file}</span>
        </div>
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
