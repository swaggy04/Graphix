"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, Panel, ReactFlow, useReactFlow, type Edge, type Node } from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import FileNode from "./FileNode";
import { analyzeFile, type FileAnalysisResponse } from "../lib/api";

interface GraphStats {
  totalFiles: number;
  parsedFiles: number;
  failedFiles: number;
  resolvedImports: number;
  resolvedInternalImports?: number;
  externalImports?: number;
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
  cycles: string[][];
  stats: GraphStats | null;
  repositoryUrl: string;
  setRepositoryUrl: React.Dispatch<React.SetStateAction<string>>;
  onAnalyze: () => Promise<void>;
  analyzing: boolean;
}

interface FileNodeData extends Record<string, unknown> {
  label?: string;
  fileType?: string;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  isolated?: boolean;
  dependency?: boolean;
  dependent?: boolean;
  impact?: boolean;
  cycle?: boolean;
}

const nodeTypes = {
  file: FileNode,
};

export default function GraphCanvas({ nodes, edges, analysisId, cycles, stats, repositoryUrl, setRepositoryUrl, onAnalyze, analyzing }: GraphCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showIsolated, setShowIsolated] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number | null>(null);
  const [dismissedNoCycleNoticeFor, setDismissedNoCycleNoticeFor] = useState<string | null>(null);
  const fileRequestController = useRef<AbortController | null>(null);

  const { setCenter, getNode, fitView } = useReactFlow();

  const activeCycleIndex = selectedCycleIndex !== null && selectedCycleIndex < cycles.length ? selectedCycleIndex : null;
  const selectedCycle = activeCycleIndex === null ? null : cycles[activeCycleIndex];
  const selectedCycleNodeIds = useMemo(() => new Set(selectedCycle ?? []), [selectedCycle]);

  /// Counts

  const isolatedCount = useMemo(() => {
    return nodes.filter((node) => {
      const data = node.data as FileNodeData | undefined;
      return data?.isolated === true;
    }).length;
  }, [nodes]);

  const connectedCount = nodes.length - isolatedCount;

  /// Visible graph

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

  /// Search

  const searchedNodeIds = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return new Set<string>();
    }

    const result = new Set<string>();

    for (const node of visibleNodes) {
      const data = node.data as FileNodeData;
      const label = String(data?.label ?? "");

      if (label.toLowerCase().includes(query) || node.id.toLowerCase().includes(query)) {
        result.add(node.id);
      }
    }

    return result;
  }, [search, visibleNodes]);

  /// Relationships

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

  /// Display nodes

  const displayNodes = useMemo(() => {
    return visibleNodes.map((node) => {
      const isSelected = node.id === selectedNode?.id;
      const isRelationshipNode = highlightedNodeIds.has(node.id);
      const isSearchMatch = searchedNodeIds.has(node.id);
      const isCycleNode = selectedCycleNodeIds.has(node.id);
      const isDependency = dependencyIds.has(node.id);
      const isDependent = dependentIds.has(node.id);
      const isImpact = fileAnalysis?.impact.affectedFiles.includes(node.id) === true;

      const hasSearch = search.trim().length > 0;
      const hasCycle = selectedCycle !== null;

      let opacity = 1;

      if (hasSearch) {
        opacity = isSearchMatch ? 1 : 0.18;
      }

      if (selectedNode && fileAnalysis) {
        opacity = isRelationshipNode ? 1 : 0.08;
      }

      if (hasSearch && selectedNode && fileAnalysis) {
        opacity = isSearchMatch && isRelationshipNode ? 1 : 0.08;
      }

      if (hasCycle) {
        opacity = isCycleNode ? 1 : 0.14;
      }

      return {
        ...node,

        data: {
          ...node.data,
          selected: isSelected,
          highlighted: isRelationshipNode || isSearchMatch || isCycleNode,
          dimmed: opacity < 1,
          dependency: isDependency,
          dependent: isDependent,
          impact: isImpact,
          cycle: isCycleNode,
        },

        style: {
          ...node.style,
          opacity,
          zIndex: isSelected || isRelationshipNode || isSearchMatch || isCycleNode ? 20 : 1,
        },
      };
    });
  }, [visibleNodes, selectedNode, fileAnalysis, highlightedNodeIds, searchedNodeIds, search, selectedCycle, selectedCycleNodeIds, dependencyIds, dependentIds]);

  /// Display edges

  const displayEdges = useMemo(() => {
    return visibleEdges.map((edge) => {
      if (selectedCycle) {
        const isCycleEdge = selectedCycleNodeIds.has(edge.source) && selectedCycleNodeIds.has(edge.target);

        return {
          ...edge,
          animated: isCycleEdge,
          style: {
            ...edge.style,
            stroke: isCycleEdge ? "#f59e0b" : "#27272a",
            strokeWidth: isCycleEdge ? 2.5 : 0.8,
            opacity: isCycleEdge ? 1 : 0.12,
          },
        };
      }

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
          opacity: 0.06,
        },
      };
    });
  }, [visibleEdges, selectedCycle, selectedCycleNodeIds, selectedNode, fileAnalysis, dependencyIds, dependentIds]);

  /// Select file

  const selectFile = useCallback(
    async (filePath: string) => {
      if (!analysisId) {
        return;
      }

      setAnalysisError(null);
      setFileAnalysis(null);
      setSelectedCycleIndex(null);

      const targetNode = getNode(filePath);

      if (targetNode) {
      setSelectedNode(targetNode);

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

      fileRequestController.current?.abort();
      const requestController = new AbortController();
      fileRequestController.current = requestController;
      setLoading(true);

      try {
        const data: FileAnalysisResponse = await analyzeFile(
          analysisId,
          filePath,
          requestController.signal,
        );

        setFileAnalysis(data);

        const focusNodes = [filePath, ...data.dependencies.direct, ...data.dependents.direct]
          .map((path) => getNode(path))
          .filter((node): node is Node => Boolean(node));

        if (focusNodes.length > 0) {
          await fitView({
            nodes: focusNodes,
            padding: 0.28,
            duration: 450,
            maxZoom: 1.05,
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("File analysis failed:", error);

        setAnalysisError(error instanceof Error ? error.message : "Failed to analyze file");
      } finally {
        if (fileRequestController.current === requestController) {
          fileRequestController.current = null;
          setLoading(false);
        }
      }
    },
    [analysisId, fitView, getNode],
  );

  const selectCycle = useCallback(
    (index: number) => {
      const cycle = cycles[index];

      if (!cycle) {
        return;
      }

      setSelectedCycleIndex(index);
      setSelectedNode(null);
      setFileAnalysis(null);
      setAnalysisError(null);
      fileRequestController.current?.abort();
      fileRequestController.current = null;
      setLoading(false);

      const cycleNodes = cycle.map((filePath) => getNode(filePath)).filter((node): node is Node => Boolean(node));

      if (cycleNodes.length === 0) {
        return;
      }

      const center = cycleNodes.reduce(
        (result, node) => ({
          x: result.x + node.position.x + (node.measured?.width ?? 240) / 2,
          y: result.y + node.position.y + (node.measured?.height ?? 70) / 2,
        }),
        { x: 0, y: 0 },
      );

      setCenter(center.x / cycleNodes.length, center.y / cycleNodes.length, {
        zoom: 1,
        duration: 450,
      });
    },
    [cycles, getNode, setCenter],
  );

  /// Node click

  const handleNodeClick = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      await selectFile(node.id);
    },
    [selectFile],
  );

  /// Search enter

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      const query = search.trim().toLowerCase();

      if (!query) {
        return;
      }

      const firstMatch = visibleNodes.find((node) => {
        const data = node.data as FileNodeData;
        const label = String(data?.label ?? "");

        return label.toLowerCase().includes(query) || node.id.toLowerCase().includes(query);
      });

      if (firstMatch) {
        void selectFile(firstMatch.id);
      }
    },
    [search, visibleNodes, selectFile],
  );

  /// Pane click

  const handlePaneClick = useCallback(() => {
    fileRequestController.current?.abort();
    fileRequestController.current = null;
    setSelectedNode(null);
    setFileAnalysis(null);
    setAnalysisError(null);
    setSelectedCycleIndex(null);
    setLoading(false);
  }, []);

  /// Analyze

  const handleAnalyze = useCallback(() => {
    if (analyzing) {
      return;
    }

    return onAnalyze();
  }, [analyzing, onAnalyze]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#09090b]">
      {nodes.length === 0 && !analyzing && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-[#111114] text-lg font-semibold text-zinc-300 shadow-2xl">
              G
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">Repository intelligence</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-200">See how your codebase connects.</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">Enter a public GitHub repository above to explore files, dependencies, circular groups, and change impact.</p>
          </div>
        </div>
      )}

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
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#242428" />
        {/*/// Top bar*/}
        <Panel position="top-center">
          <div
            className="
              flex items-center gap-2
              rounded-2xl
              border border-zinc-800/80
              bg-[#111114]/95
              p-1.5
              shadow-xl
              backdrop-blur-xl
            "
          >
            <div className="hidden items-center gap-2 px-3 sm:flex">
              <div
                className="
                  flex h-7 w-7 items-center justify-center
                  rounded-lg border border-zinc-700
                  bg-zinc-900 text-xs font-semibold text-zinc-200
                "
              >
                G
              </div>

              <span className="text-sm font-semibold text-zinc-200">Grapix</span>
            </div>
            <div className="h-5 w-px bg-zinc-800" />
            {/*/// Search*/}
            <div
              className="
                relative flex w-[min(28vw,320px)]
                items-center gap-2 rounded-xl
                border border-zinc-800
                bg-[#09090b] px-3
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
                  h-9 min-w-0 flex-1
                  bg-transparent text-xs text-zinc-200
                  outline-none placeholder:text-zinc-600
                "
              />

              {search.trim() && (
                <div
                  className="
                    absolute left-0 top-full z-50 mt-2
                    w-full overflow-hidden rounded-xl
                    border border-zinc-800
                    bg-[#111114] shadow-2xl
                  "
                >
                  {visibleNodes.filter((node) => {
                    const data = node.data as FileNodeData;
                    const query = search.trim().toLowerCase();
                    const label = String(data?.label ?? "");

                    return label.toLowerCase().includes(query) || node.id.toLowerCase().includes(query);
                  }).length === 0 ? (
                    <div className="px-3 py-4 text-xs text-zinc-600">No files found</div>
                  ) : (
                    visibleNodes
                      .filter((node) => {
                        const data = node.data as FileNodeData;
                        const query = search.trim().toLowerCase();
                        const label = String(data?.label ?? "");

                        return label.toLowerCase().includes(query) || node.id.toLowerCase().includes(query);
                      })
                      .slice(0, 8)
                      .map((node) => {
                        const data = node.data as FileNodeData;

                        return (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => {
                              setSearch("");
                              void selectFile(node.id);
                            }}
                            className="
                              block w-full border-b
                              border-zinc-800/60 px-3 py-2.5
                              text-left last:border-0
                              hover:bg-zinc-900
                            "
                          >
                            <div className="truncate text-xs text-zinc-300">{String(data.label ?? node.id)}</div>

                            <div className="mt-0.5 truncate text-[10px] text-zinc-600">{node.id}</div>
                          </button>
                        );
                      })
                  )}
                </div>
              )}

              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-xs text-zinc-600 hover:text-zinc-300">
                  ×
                </button>
              )}
            </div>
            {/*/// Repository*/}
            <div
              className="
                flex w-[min(35vw,420px)]
                items-center gap-2 rounded-xl
                border border-zinc-800
                bg-[#09090b] px-3
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
                  h-9 min-w-0 flex-1
                  bg-transparent text-xs text-zinc-200
                  outline-none placeholder:text-zinc-600
                  disabled:opacity-50
                "
              />
            </div>
            {/*/// Analyze*/}
            <button
              onClick={() => void handleAnalyze()}
              disabled={analyzing}
              className="
                h-9 rounded-xl bg-zinc-100
                px-4 text-xs font-semibold text-zinc-950
                transition hover:bg-white
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {analyzing ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </Panel>
        {nodes.length > 0 && cycles.length === 0 && analysisId && dismissedNoCycleNoticeFor !== analysisId && (
          <Panel position="top-center" style={{ marginTop: "74px" }}>
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-[#0d1713]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/10 text-sm text-emerald-400">✓</span>
              <div>
                <div className="text-xs font-medium text-zinc-200">No circular dependencies found</div>
                <div className="mt-0.5 text-[10px] text-zinc-500">The analyzed graph contains no dependency cycles.</div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedNoCycleNoticeFor(analysisId)}
                className="ml-2 text-zinc-600 transition hover:text-zinc-300"
                aria-label="Dismiss cycle status"
              >
                ×
              </button>
            </div>
          </Panel>
        )}
        {/*/// Stats*/}
        {nodes.length > 0 && (
          <Panel position="top-left">
            <div className="space-y-2">
              <div
                className="
                  flex items-center gap-1
                  rounded-xl border border-zinc-800/80
                  bg-[#111114]/95 p-1
                  shadow-lg backdrop-blur-xl
                "
              >
                <Stat label="Files" value={stats?.totalFiles ?? nodes.length} />

                <div className="h-5 w-px bg-zinc-800" />

                <Stat label="Connected" value={connectedCount} />

                <div className="h-5 w-px bg-zinc-800" />

                <Stat label="Isolated" value={isolatedCount} />

                <div className="h-5 w-px bg-zinc-800" />

                <Stat label="Cycles" value={cycles.length} />
              </div>

              {stats && (
                <div className="flex items-center gap-2 rounded-lg border border-zinc-800/80 bg-[#111114]/80 px-3 py-2 text-[10px] text-zinc-500 shadow-lg backdrop-blur-xl">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                  <span>{stats.parsedFiles.toLocaleString()} parsed</span>
                  <span className="text-zinc-700">·</span>
                  <span>{stats.resolvedImports.toLocaleString()} imports</span>
                  {stats.failedFiles > 0 && <span className="text-rose-400/80">{stats.failedFiles.toLocaleString()} failed</span>}
                </div>
              )}

              {cycles.length > 0 ? (
                <div className="rounded-xl border border-amber-500/20 bg-[#17130b]/90 p-2 shadow-lg backdrop-blur-xl">
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-400/80">Circular dependencies</span>
                    {selectedCycle && <span className="text-[9px] text-amber-300">{selectedCycle.length} files</span>}
                  </div>

                  <select
                    value={activeCycleIndex ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (value === "") {
                        setSelectedCycleIndex(null);
                        return;
                      }

                      selectCycle(Number(value));
                    }}
                    className="h-8 w-full rounded-lg border border-amber-500/20 bg-[#0c0c0f] px-2 text-[10px] text-zinc-300 outline-none transition focus:border-amber-400/50"
                    aria-label="Select circular dependency group"
                  >
                    <option value="">Select a cycle...</option>
                    {cycles.map((cycle, index) => (
                      <option key={`${index}-${cycle[0] ?? "cycle"}`} value={index}>
                        Cycle {index + 1} · {cycle.length} files
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </Panel>
        )}
        {/*/// View switcher//*/}
        {nodes.length > 0 && isolatedCount > 0 && !selectedNode && (
          <Panel position="bottom-center">
            <div
              className="
                  flex items-center gap-1
                  rounded-xl border border-zinc-800/80
                  bg-[#111114]/95 p-1 shadow-xl
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
        {nodes.length > 0 && (
          <Panel position="bottom-left" className="!bottom-32 !left-4">
            <div className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-[#111114]/90 px-3 py-2 text-[10px] text-zinc-500 shadow-lg backdrop-blur-xl">
              <LegendDot color="bg-blue-400" label="TypeScript" />
              <LegendDot color="bg-yellow-400" label="JavaScript" />
              <LegendDot color="bg-amber-400" label="Cycle" />
            </div>
          </Panel>
        )}
        {/*/// Controls*/}
        <Controls position="bottom-left" showInteractive={false} className="grapix-controls" />
        {/*/// Mini map*/}
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
        {/* File inspector */}
        {selectedNode && (
          <Panel
            position="top-right"
            style={{
              marginTop: "76px",
              marginRight: "12px",
            }}
          >
            <FileInspector selectedNode={selectedNode} fileAnalysis={fileAnalysis} loading={loading} error={analysisError} onClose={handlePaneClick} onFileClick={selectFile} />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2.5 py-1.5">
      <div className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">{label}</div>

      <div className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-300">{value.toLocaleString()}</div>
    </div>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-lg px-3 py-1.5
        text-[11px] font-medium transition
        ${active ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:text-zinc-300"}
      `}
    >
      {children}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function FileInspector({
  selectedNode,
  fileAnalysis,
  loading,
  error,
  onClose,
  onFileClick,
}: {
  selectedNode: Node;
  fileAnalysis: FileAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onFileClick: (filePath: string) => void;
}) {
  return (
    <aside
      className="
        flex max-h-[min(620px,calc(100vh-104px))] w-[300px]
        max-w-[calc(100vw-32px)]
        flex-col
        overflow-hidden rounded-2xl
        border border-zinc-800/90
        bg-[#111114]/96 shadow-[0_24px_80px_rgba(0,0,0,0.5)]
      "
    >
      {/*/// Header*/}
      <div className="shrink-0 border-b border-zinc-800/80 px-3.5 py-3">
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
              flex h-7 w-7 shrink-0
              items-center justify-center
              rounded-lg text-zinc-600
              hover:bg-zinc-800 hover:text-zinc-300
            "
          >
            ×
          </button>
        </div>
      </div>
      {/*/// Loading*/}
      {loading && <div className="px-4 py-8 text-xs text-zinc-500">Analyzing dependency relationships...</div>}
      {/*/// Error*/}
      {error && !loading && (
        <div className="border-b border-zinc-800/80 px-4 py-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-[10px] leading-4 text-zinc-400">{error}</div>
        </div>
      )}
      {fileAnalysis && !loading && !error && (
        <div className="grid grid-cols-3 gap-2 border-b border-zinc-800/80 px-4 py-3">
          <InspectorMetric label="Depends on" value={fileAnalysis.dependencies.direct.length} />
          <InspectorMetric label="Used by" value={fileAnalysis.dependents.direct.length} />
          <InspectorMetric label="Impact" value={fileAnalysis.impact.affectedFiles.length} />
        </div>
      )}
      {/*/// Analysis*/}
      {fileAnalysis && !loading && (
        <div className="min-h-0 flex-1 overflow-y-auto grapix-inspector-scroll">
          <AnalysisSection title="Dependencies" direct={fileAnalysis.dependencies.direct} transitive={fileAnalysis.dependencies.transitive} onFileClick={onFileClick} />
          <AnalysisSection title="Dependents" direct={fileAnalysis.dependents.direct} transitive={fileAnalysis.dependents.transitive} onFileClick={onFileClick} />
          {/*/// Impact*/}
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

function AnalysisSection({ title, direct, transitive, onFileClick }: { title: string; direct: string[]; transitive: string[]; onFileClick: (filePath: string) => void }) {
  const total = new Set([...direct, ...transitive]).size;

  return (
    <section className="border-b border-zinc-800/80 px-4 py-3.5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-200">{title}</div>

          <div className="mt-0.5 text-[10px] text-zinc-600">Direct and transitive relationships</div>
        </div>

        <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] font-medium tabular-nums text-zinc-500">{total}</span>
      </div>
      {/*/// Direct*/}
      <div>
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-600">Direct</div>

        {direct.length === 0 ? <EmptyText text="None" /> : <FileList files={direct} onFileClick={onFileClick} />}
      </div>
      <details className="mt-4 group">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[9px] font-semibold uppercase tracking-wider text-zinc-600 transition hover:text-zinc-300">
          <span>Transitive</span>
          <span className="flex items-center gap-2 normal-case tracking-normal text-zinc-700">
            {transitive.length}
            <span className="text-xs transition group-open:rotate-180">⌄</span>
          </span>
        </summary>

        <div className="mt-2">{transitive.length === 0 ? <EmptyText text="None" /> : <FileList files={transitive} onFileClick={onFileClick} />}</div>
      </details>
    </section>
  );
}

function FileList({ files, onFileClick }: { files: string[]; onFileClick: (filePath: string) => void }) {
  return (
    <div className="max-h-32 space-y-1 overflow-y-auto pr-1 grapix-inspector-scroll">
      {files.map((file) => (
        <button
          key={file}
          type="button"
          title={`Open ${file}`}
          onClick={() => onFileClick(file)}
          className="
            block w-full rounded-lg
            border border-zinc-800/80
            bg-[#0c0c0f] px-2.5 py-2
            text-left text-[10px]
            leading-4 text-zinc-500
            transition hover:border-zinc-600
            hover:bg-zinc-900 hover:text-zinc-200
          "
        >
          <span className="line-clamp-2 break-all">{file}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-[10px] text-zinc-700">{text}</p>;
}

function InspectorMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-[#0c0c0f] px-2 py-2">
      <div className="text-[9px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="mt-1 text-sm font-semibold tabular-nums text-zinc-200">{value.toLocaleString()}</div>
    </div>
  );
}

function getFileName(path: string) {
  const normalized = path.replace(/\\/g, "/");

  return normalized.split("/").pop() ?? path;
}
