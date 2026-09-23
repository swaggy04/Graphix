"use client";

import { useCallback, useMemo, useState } from "react";

import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, ReactFlowProvider, type Edge, type Node, type OnEdgesChange, type OnNodesChange } from "@xyflow/react";

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

const nodeTypes = {
  file: FileNode,
};

export default function GraphCanvas({ nodes, edges, analysisId, repositoryUrl, setRepositoryUrl, onAnalyze, analyzing }: GraphCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  /*
   * --------------------------------------------------
   * Highlight relationship IDs
   * --------------------------------------------------
   */

  const highlightedNodeIds = useMemo(() => {
    if (!selectedNode || !fileAnalysis) {
      return new Set<string>();
    }

    return new Set([selectedNode.id, ...fileAnalysis.dependencies.direct, ...fileAnalysis.dependents.direct]);
  }, [selectedNode, fileAnalysis]);

  /*
   * --------------------------------------------------
   * Visual graph
   *
   * We derive visual state instead of mutating the
   * original graph supplied by the parent.
   * --------------------------------------------------
   */

  const visualNodes = useMemo(() => {
    if (!selectedNode || !fileAnalysis) {
      return nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          selected: false,
          highlighted: false,
          dimmed: false,
        },
      }));
    }

    return nodes.map((node) => {
      const isSelected = node.id === selectedNode.id;

      const isHighlighted = highlightedNodeIds.has(node.id);

      return {
        ...node,

        data: {
          ...node.data,

          selected: isSelected,

          highlighted: isHighlighted,

          /*
           * Keep unrelated nodes visible.
           * We intentionally do NOT make them disappear.
           */
          dimmed: !isHighlighted,
        },
      };
    });
  }, [nodes, selectedNode, fileAnalysis, highlightedNodeIds]);

  /*
   * --------------------------------------------------
   * Visual edges
   * --------------------------------------------------
   */

  const visualEdges = useMemo(() => {
    if (!selectedNode || !fileAnalysis) {
      return edges.map((edge) => ({
        ...edge,

        animated: false,

        style: {
          ...edge.style,

          stroke: "#52525b",

          strokeWidth: 1.25,

          opacity: 0.65,
        },
      }));
    }

    return edges.map((edge) => {
      const touchesSelected = edge.source === selectedNode.id || edge.target === selectedNode.id;

      return {
        ...edge,

        animated: touchesSelected,

        style: {
          ...edge.style,

          stroke: touchesSelected ? "#a1a1aa" : "#3f3f46",

          strokeWidth: touchesSelected ? 2 : 1.1,

          opacity: touchesSelected ? 0.95 : 0.35,
        },
      };
    });
  }, [edges, selectedNode, fileAnalysis]);

  /*
   * --------------------------------------------------
   * Select node
   * --------------------------------------------------
   */

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

  /*
   * --------------------------------------------------
   * Clear selection
   * --------------------------------------------------
   */

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setFileAnalysis(null);
  }, []);

  /*
   * --------------------------------------------------
   * Keyboard escape
   * --------------------------------------------------
   */

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setSelectedNode(null);
      setFileAnalysis(null);
    }
  }, []);

  /*
   * --------------------------------------------------
   * Render
   * --------------------------------------------------
   */

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full overflow-hidden bg-[#0b0b0d] text-zinc-200" tabIndex={0} onKeyDown={handleKeyDown}>
        <ReactFlow
          nodes={visualNodes}
          edges={visualEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            maxZoom: 1.05,
          }}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          defaultEdgeOptions={{
            type: "smoothstep",
          }}
          minZoom={0.08}
          maxZoom={2}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          proOptions={{
            hideAttribution: true,
          }}
        >
          {/* ==================================================
              BACKGROUND
          ================================================== */}

          <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="#27272a" />

          {/* ==================================================
              TOP NAV
          ================================================== */}

          <Panel position="top-center">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800/90 bg-[#111113]/95 p-1.5 shadow-xl backdrop-blur-xl">
              {/* Brand */}

              <div className="flex items-center gap-2 px-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200">G</div>

                <span className="text-sm font-semibold tracking-tight text-zinc-100">Grapix</span>
              </div>

              <div className="h-5 w-px bg-zinc-800" />

              {/* Repository input */}

              <input
                type="text"
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !analyzing) {
                    void onAnalyze();
                  }
                }}
                placeholder="GitHub repository URL"
                disabled={analyzing}
                aria-label="GitHub repository URL"
                className="
                  w-[360px]
                  rounded-lg
                  border
                  border-transparent
                  bg-transparent
                  px-3
                  py-2
                  text-sm
                  text-zinc-200
                  outline-none
                  transition
                  placeholder:text-zinc-600
                  hover:bg-zinc-900/60
                  focus:border-zinc-700
                  focus:bg-zinc-900
                  disabled:opacity-50
                "
              />

              <button
                type="button"
                onClick={() => void onAnalyze()}
                disabled={analyzing || !repositoryUrl.trim()}
                className="
                  rounded-lg
                  bg-zinc-100
                  px-4
                  py-2
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
              GRAPH STATS
          ================================================== */}

          {nodes.length > 0 && (
            <Panel position="top-left">
              <div className="rounded-xl border border-zinc-800/90 bg-[#111113]/90 px-4 py-3 shadow-lg backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">Repository graph</span>
                </div>

                <div className="mt-2 flex items-center gap-4">
                  <Stat label="Files" value={nodes.length} />

                  <div className="h-7 w-px bg-zinc-800" />

                  <Stat label="Dependencies" value={edges.length} />
                </div>
              </div>
            </Panel>
          )}

          {/* ==================================================
              LEGEND
          ================================================== */}

          <Panel position="bottom-left">
            <div className="rounded-xl border border-zinc-800/90 bg-[#111113]/90 px-3 py-2.5 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <LegendItem color="bg-blue-400" label="TypeScript" />

                <LegendItem color="bg-yellow-400" label="JavaScript" />

                <LegendItem color="bg-emerald-400" label="Data" />
              </div>
            </div>
          </Panel>

          {/* ==================================================
              CONTROLS
          ================================================== */}

          <Controls position="bottom-left" showInteractive={false} className="!bottom-16" />

          {/* ==================================================
              MINIMAP
          ================================================== */}

          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            bgColor="#111113"
            maskColor="rgba(9, 9, 11, 0.72)"
            nodeColor={(node) => {
              const data = node.data as {
                selected?: boolean;
                highlighted?: boolean;
              };

              if (data?.selected) {
                return "#f4f4f5";
              }

              if (data?.highlighted) {
                return "#71717a";
              }

              return "#3f3f46";
            }}
            nodeStrokeColor="#52525b"
            nodeStrokeWidth={1}
          />

          {/* ==================================================
              SELECTED FILE PANEL
          ================================================== */}

          {selectedNode && (
            <Panel position="top-right">
              <FileAnalysisPanel node={selectedNode} analysis={fileAnalysis} loading={loading} onClose={handlePaneClick} />
            </Panel>
          )}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

/* ============================================================
   STAT
============================================================ */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-lg font-semibold tracking-tight text-zinc-100">{value.toLocaleString()}</div>

      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
    </div>
  );
}

/* ============================================================
   LEGEND
============================================================ */

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />

      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
  );
}

/* ============================================================
   FILE ANALYSIS PANEL
============================================================ */

function FileAnalysisPanel({ node, analysis, loading, onClose }: { node: Node; analysis: FileAnalysis | null; loading: boolean; onClose: () => void }) {
  const path = node.id.replace(/\\/g, "/");

  const parts = path.split("/");

  const fileName = parts[parts.length - 1] ?? path;

  const directory = parts.length > 1 ? parts.slice(0, -1).join("/") : "";

  return (
    <div
      className="
        w-[360px]
        max-w-[calc(100vw-32px)]
        overflow-hidden
        rounded-2xl
        border
        border-zinc-800/90
        bg-[#111113]/98
        shadow-2xl
        backdrop-blur-xl
      "
    >
      {/* Header */}

      <div className="border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">File</div>

            <div className="truncate text-sm font-semibold text-zinc-100">{fileName}</div>

            {directory && (
              <div className="mt-1 truncate text-[10px] text-zinc-600" title={directory}>
                {directory}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close file panel"
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
        <div className="px-5 py-8">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />

            <span className="text-xs text-zinc-500">Analyzing file relationships...</span>
          </div>
        </div>
      )}

      {/* Analysis */}

      {analysis && !loading && (
        <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
          <AnalysisSection title="Dependencies" direct={analysis.dependencies.direct} transitive={analysis.dependencies.transitive} />

          <AnalysisSection title="Dependents" direct={analysis.dependents.direct} transitive={analysis.dependents.transitive} />

          <section className="border-t border-zinc-800/80 px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-200">Impact</h3>

              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500">{analysis.impact.affectedFiles.length}</span>
            </div>

            {analysis.impact.affectedFiles.length === 0 ? <p className="text-xs text-zinc-600">No affected files.</p> : <FileList files={analysis.impact.affectedFiles} />}
          </section>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ANALYSIS SECTION
============================================================ */

function AnalysisSection({ title, direct, transitive }: { title: string; direct: string[]; transitive: string[] }) {
  const total = direct.length + transitive.length;

  return (
    <section className="border-b border-zinc-800/80 px-5 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-200">{title}</h3>

        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500">{total}</span>
      </div>

      <AnalysisGroup label="Direct" files={direct} />

      <div className="mt-4">
        <AnalysisGroup label="Transitive" files={transitive} />
      </div>
    </section>
  );
}

/* ============================================================
   ANALYSIS GROUP
============================================================ */

function AnalysisGroup({ label, files }: { label: string; files: string[] }) {
  return (
    <div>
      <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-600">{label}</div>

      {files.length === 0 ? <div className="text-xs text-zinc-700">None</div> : <FileList files={files} />}
    </div>
  );
}

/* ============================================================
   FILE LIST
============================================================ */

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
            bg-zinc-900/40
            px-3
            py-2
            text-[11px]
            text-zinc-500
            transition
            hover:border-zinc-700
            hover:bg-zinc-900
            hover:text-zinc-300
          "
        >
          <span className="block truncate">{file.replace(/\\/g, "/")}</span>
        </div>
      ))}
    </div>
  );
}
