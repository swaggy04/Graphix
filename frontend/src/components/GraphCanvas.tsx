"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { graphlib, layout } from "@dagrejs/dagre";

import "@xyflow/react/dist/style.css";

import FileNode from "./FileNode";
import FileInspector from "./FileInspector";
import GraphGroupNode from "./GraphGroupNode";
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
  kind?: "file" | "directory";
  label?: string;
  fileType?: string;
  fileIds?: string[];
  count?: number;
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
  group: GraphGroupNode,
};

const DIRECTORY_OVERVIEW_THRESHOLD = 60;

function getDirectoryGroup(filePath: string) {
  const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean);

  if (parts.length <= 1) {
    return "root";
  }

  return parts.slice(0, Math.min(parts.length - 1, 2)).join("/");
}

function layoutFocusedNodes(nodes: Node[], edges: Edge[]) {
  if (nodes.length <= 1) {
    return nodes;
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const graph = new graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: "TB",
    nodesep: 72,
    ranksep: 120,
    marginx: 48,
    marginy: 48,
  });

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: 280,
      height: 70,
    });
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  try {
    layout(graph);
  } catch {
    return nodes;
  }

  return nodes.map((node) => {
    const position = graph.node(node.id);

    if (!position) {
      return node;
    }

    return {
      ...node,
      position: {
        x: position.x - 140,
        y: position.y - 35,
      },
    };
  });
}

function getFileName(filePath: string) {
  return filePath.replace(/\\/g, "/").split("/").pop() ?? filePath;
}

export default function GraphCanvas({
  nodes,
  edges,
  analysisId,
  cycles,
  stats,
  repositoryUrl,
  setRepositoryUrl,
  onAnalyze,
  analyzing,
}: GraphCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysisResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [showIsolated, setShowIsolated] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number | null>(
    null,
  );
  const [dismissedNoCycleNoticeFor, setDismissedNoCycleNoticeFor] = useState<
    string | null
  >(null);
  const [focusSelection, setFocusSelection] = useState(false);
  const [graphViewModeOverride, setGraphViewModeOverride] = useState<
    "files" | "directories" | null
  >(null);
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null);

  const fileRequestController = useRef<AbortController | null>(null);

  const { setCenter, getNode, fitView } = useReactFlow();

  const graphViewMode =
    graphViewModeOverride ??
    (nodes.length > DIRECTORY_OVERVIEW_THRESHOLD ? "directories" : "files");

  useEffect(() => {
    if (!analysisId || cycles.length > 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDismissedNoCycleNoticeFor(analysisId);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [analysisId, cycles.length]);

  const activeCycleIndex =
    selectedCycleIndex !== null && selectedCycleIndex < cycles.length
      ? selectedCycleIndex
      : null;

  const selectedCycle =
    activeCycleIndex === null ? null : cycles[activeCycleIndex];

  const selectedCycleNodeIds = useMemo(
    () => new Set(selectedCycle ?? []),
    [selectedCycle],
  );

  // Counts

  const isolatedCount = useMemo(
    () =>
      nodes.filter((node) => {
        const data = node.data as FileNodeData | undefined;
        return data?.isolated === true;
      }).length,
    [nodes],
  );

  const connectedCount = nodes.length - isolatedCount;

  const directoryGroups = useMemo(() => {
    const groups = new Map<string, string[]>();

    for (const node of nodes) {
      const group = getDirectoryGroup(node.id);
      const fileIds = groups.get(group) ?? [];
      fileIds.push(node.id);
      groups.set(group, fileIds);
    }

    return Array.from(groups.entries()).map(([label, fileIds], index) => ({
      id: `group:${label}`,
      label,
      fileIds,
      position: {
        x: (index % 4) * 360,
        y: Math.floor(index / 4) * 220,
      },
    }));
  }, [nodes]);

  const directoryGroupByFile = useMemo(() => {
    const result = new Map<string, string>();

    for (const group of directoryGroups) {
      for (const fileId of group.fileIds) {
        result.set(fileId, group.id);
      }
    }

    return result;
  }, [directoryGroups]);

  const directoryNodes = useMemo<Node[]>(
    () =>
      directoryGroups.map((group) => ({
        id: group.id,
        type: "group",
        position: group.position,
        data: {
          kind: "directory",
          label: group.label,
          count: group.fileIds.length,
          fileIds: group.fileIds,
        },
      })),
    [directoryGroups],
  );

  const directoryEdges = useMemo<Edge[]>(() => {
    const seen = new Set<string>();
    const result: Edge[] = [];

    for (const edge of edges) {
      const source = directoryGroupByFile.get(edge.source);
      const target = directoryGroupByFile.get(edge.target);

      if (!source || !target || source === target) {
        continue;
      }

      const key = `${source}->${target}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push({
        id: `group-edge:${key}`,
        source,
        target,
      });
    }

    return result;
  }, [directoryGroupByFile, edges]);

  const positionedDirectoryNodes = useMemo(
    () => layoutFocusedNodes(directoryNodes, directoryEdges),
    [directoryEdges, directoryNodes],
  );

  // Visible graph

  const visibleNodes = useMemo(() => {
    if (graphViewMode === "directories") {
      return positionedDirectoryNodes;
    }

    if (showIsolated) {
      return nodes;
    }

    return nodes.filter((node) => {
      const data = node.data as FileNodeData | undefined;
      return data?.isolated !== true;
    });
  }, [graphViewMode, nodes, positionedDirectoryNodes, showIsolated]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes],
  );

  const visibleEdges = useMemo(() => {
    if (graphViewMode === "directories") {
      return directoryEdges;
    }

    if (showIsolated) {
      return edges;
    }

    return edges.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
  }, [directoryEdges, edges, graphViewMode, showIsolated, visibleNodeIds]);

  // Search

  const searchedNodeIds = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return new Set<string>();
    }

    const result = new Set<string>();

    for (const node of visibleNodes) {
      const data = node.data as FileNodeData;
      const label = String(data?.label ?? "");

      if (
        label.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query)
      ) {
        result.add(node.id);
      }
    }

    return result;
  }, [search, visibleNodes]);

  // Relationships

  const dependencyIds = useMemo(
    () => new Set(fileAnalysis?.dependencies.direct ?? []),
    [fileAnalysis],
  );

  const dependentIds = useMemo(
    () => new Set(fileAnalysis?.dependents.direct ?? []),
    [fileAnalysis],
  );

  const highlightedNodeIds = useMemo(() => {
    if (!selectedNode || !fileAnalysis) {
      return new Set<string>();
    }

    return new Set([
      selectedNode.id,
      ...fileAnalysis.dependencies.direct,
      ...fileAnalysis.dependents.direct,
    ]);
  }, [selectedNode, fileAnalysis]);

  const focusedNodeIds = useMemo(() => {
    if (!focusSelection) {
      return null;
    }

    if (focusedGroupId) {
      const group = directoryGroups.find(
        (entry) => entry.id === focusedGroupId,
      );
      return new Set(group?.fileIds ?? []);
    }

    if (selectedCycle) {
      return selectedCycleNodeIds;
    }

    if (selectedNode) {
      const ids = new Set<string>([selectedNode.id, ...highlightedNodeIds]);

      for (const edge of edges) {
        if (
          edge.source === selectedNode.id ||
          edge.target === selectedNode.id
        ) {
          ids.add(edge.source);
          ids.add(edge.target);
        }
      }

      return ids;
    }

    return null;
  }, [
    directoryGroups,
    focusedGroupId,
    focusSelection,
    selectedCycle,
    selectedCycleNodeIds,
    selectedNode,
    highlightedNodeIds,
    edges,
  ]);

  const renderedNodes = useMemo(() => {
    if (!focusedNodeIds) {
      return visibleNodes;
    }

    return visibleNodes.filter((node) => focusedNodeIds.has(node.id));
  }, [visibleNodes, focusedNodeIds]);

  const renderedNodeIds = useMemo(
    () => new Set(renderedNodes.map((node) => node.id)),
    [renderedNodes],
  );

  const renderedEdges = useMemo(
    () =>
      visibleEdges.filter(
        (edge) =>
          renderedNodeIds.has(edge.source) && renderedNodeIds.has(edge.target),
      ),
    [visibleEdges, renderedNodeIds],
  );

  const positionedNodes = useMemo(() => {
    if (!focusSelection && !selectedCycle && !focusedGroupId) {
      return renderedNodes;
    }

    return layoutFocusedNodes(renderedNodes, renderedEdges);
  }, [
    focusSelection,
    focusedGroupId,
    renderedEdges,
    renderedNodes,
    selectedCycle,
  ]);

  // Display nodes

  const displayNodes = useMemo(
    () =>
      positionedNodes.map((node) => {
        const isSelected = node.id === selectedNode?.id;
        const isRelationshipNode = highlightedNodeIds.has(node.id);
        const isSearchMatch = searchedNodeIds.has(node.id);
        const isCycleNode = selectedCycleNodeIds.has(node.id);
        const isDependency = dependencyIds.has(node.id);
        const isDependent = dependentIds.has(node.id);
        const isImpact =
          fileAnalysis?.impact.affectedFiles.includes(node.id) === true;

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
            zIndex:
              isSelected || isRelationshipNode || isSearchMatch || isCycleNode
                ? 20
                : 1,
          },
        };
      }),
    [
      positionedNodes,
      selectedNode,
      fileAnalysis,
      highlightedNodeIds,
      searchedNodeIds,
      search,
      selectedCycle,
      selectedCycleNodeIds,
      dependencyIds,
      dependentIds,
    ],
  );

  // Display edges

  const displayEdges = useMemo(
    () =>
      renderedEdges.map((edge) => {
        if (selectedCycle) {
          const isCycleEdge =
            selectedCycleNodeIds.has(edge.source) &&
            selectedCycleNodeIds.has(edge.target);

          return {
            ...edge,
            animated: true,
            style: {
              ...edge.style,
              stroke: isCycleEdge ? "#ffffff" : "#27272a",
              strokeWidth: isCycleEdge ? 2.5 : 0.8,
              opacity: isCycleEdge ? 1 : 0.12,
              strokeDasharray: isCycleEdge ? "7 5" : "5 6",
            },
            markerEnd: isCycleEdge
              ? { type: MarkerType.ArrowClosed, color: "#ffffff" }
              : undefined,
          };
        }

        if (!selectedNode || !fileAnalysis) {
          return {
            ...edge,
            animated: true,
            style: {
              ...edge.style,
              stroke: "#52525b",
              strokeWidth: 1,
              opacity: 0.45,
              strokeDasharray: "5 6",
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "#52525b",
            },
          };
        }

        const isDependency =
          edge.source === selectedNode.id && dependencyIds.has(edge.target);

        const isDependent =
          edge.target === selectedNode.id && dependentIds.has(edge.source);

        if (isDependency || isDependent) {
          return {
            ...edge,
            animated: true,
            style: {
              ...edge.style,
              stroke: isDependency ? "#ffffff" : "#d4d4d8",
              strokeWidth: 2.6,
              opacity: 1,
              strokeDasharray: "7 5",
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isDependency ? "#ffffff" : "#d4d4d8",
            },
          };
        }

        return {
          ...edge,
          animated: true,
          style: {
            ...edge.style,
            stroke: "#27272a",
            strokeWidth: 0.8,
            opacity: 0.12,
            strokeDasharray: "4 7",
          },
          markerEnd: undefined,
        };
      }),
    [
      renderedEdges,
      selectedCycle,
      selectedCycleNodeIds,
      selectedNode,
      fileAnalysis,
      dependencyIds,
      dependentIds,
    ],
  );

  useEffect(() => {
    if (displayNodes.length === 0) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      void fitView({
        padding: 0.18,
        maxZoom: 1.05,
        minZoom: 0.08,
        duration: 300,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    displayNodes.length,
    fitView,
    focusedGroupId,
    graphViewMode,
    showIsolated,
  ]);

  // Select file

  const selectFile = useCallback(
    async (filePath: string) => {
      if (!analysisId) {
        return;
      }

      setAnalysisError(null);
      setFileAnalysis(null);
      setSelectedCycleIndex(null);
      setGraphViewModeOverride("files");
      setFocusedGroupId(null);
      setFocusSelection(true);

      const targetNode = getNode(filePath);

      if (targetNode) {
        setSelectedNode(targetNode);

        setCenter(
          targetNode.position.x + (targetNode.measured?.width ?? 280) / 2,
          targetNode.position.y + (targetNode.measured?.height ?? 70) / 2,
          {
            zoom: 1.25,
            duration: 450,
          },
        );
      } else {
        setSelectedNode({
          id: filePath,
          position: { x: 0, y: 0 },
          data: {
            label: getFileName(filePath),
          },
        });
      }

      // Cancel the previous request and register this one as current.
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

        // Only the latest request may update the analysis.
        if (fileRequestController.current === requestController) {
          setFileAnalysis(data);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        // Ignore errors from requests that are no longer current.
        if (fileRequestController.current === requestController) {
          console.error("File analysis failed:", error);

          setAnalysisError(
            error instanceof Error ? error.message : "Failed to analyze file",
          );
        }
      } finally {
        // Only the latest request may clear the loading state.
        if (fileRequestController.current === requestController) {
          fileRequestController.current = null;
          setLoading(false);
        }
      }
    },
    [analysisId, getNode, setCenter],
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
      setGraphViewModeOverride("files");
      setFocusedGroupId(null);
      setFocusSelection(true);

      fileRequestController.current?.abort();
      fileRequestController.current = null;

      setLoading(false);

      const cycleNodes = cycle
        .map((filePath) => nodes.find((node) => node.id === filePath))
        .filter((node): node is Node => Boolean(node));

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
    [cycles, nodes, setCenter],
  );

  // Node click

  const handleNodeClick = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      const data = node.data as FileNodeData;

      if (data.kind === "directory") {
        // Invalidate any file request before switching views.
        fileRequestController.current?.abort();
        fileRequestController.current = null;

        setLoading(false);
        setGraphViewModeOverride("files");
        setFocusedGroupId(node.id);
        setShowIsolated(true);
        setSelectedNode(null);
        setFileAnalysis(null);
        setSelectedCycleIndex(null);
        setAnalysisError(null);
        setFocusSelection(true);
        return;
      }

      await selectFile(node.id);
    },
    [selectFile],
  );

  // Search enter

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

        return (
          label.toLowerCase().includes(query) ||
          node.id.toLowerCase().includes(query)
        );
      });

      if (firstMatch) {
        const data = firstMatch.data as FileNodeData;

        if (data.kind === "directory") {
          fileRequestController.current?.abort();
          fileRequestController.current = null;

          setLoading(false);
          setGraphViewModeOverride("files");
          setFocusedGroupId(firstMatch.id);
          setShowIsolated(true);
          setFocusSelection(true);
          setSelectedNode(null);
          setFileAnalysis(null);
          setAnalysisError(null);
        } else {
          void selectFile(firstMatch.id);
        }
      }
    },
    [search, visibleNodes, selectFile],
  );

  // Pane click

  const handlePaneClick = useCallback(() => {
    fileRequestController.current?.abort();
    fileRequestController.current = null;

    setSelectedNode(null);
    setFileAnalysis(null);
    setAnalysisError(null);
    setSelectedCycleIndex(null);
    setFocusedGroupId(null);
    setGraphViewModeOverride(null);
    setLoading(false);
  }, []);

  // Analyze

  const handleAnalyze = useCallback(() => {
    if (analyzing) {
      return;
    }

    // Invalidate any outstanding file-analysis request.
    fileRequestController.current?.abort();
    fileRequestController.current = null;

    setLoading(false);
    setFocusSelection(false);
    setSelectedNode(null);
    setFileAnalysis(null);
    setAnalysisError(null);
    setSelectedCycleIndex(null);
    setFocusedGroupId(null);
    setGraphViewModeOverride(null);

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
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
              Repository intelligence
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-200">
              See how your codebase connects.
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Enter a public GitHub repository above to explore files,
              dependencies, circular groups, and change impact.
            </p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        fitView
        onlyRenderVisibleElements
        fitViewOptions={{
          padding: 0.18,
          maxZoom: 1.05,
          minZoom: 0.08,
        }}
        minZoom={0.04}
        maxZoom={2}
        nodesConnectable={false}
        nodesFocusable
        edgesFocusable={false}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
        proOptions={{
          hideAttribution: false,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="#242428"
        />

        {/* Top bar */}
        <Panel position="top-center">
          <div
            className="
              flex items-center gap-2 rounded-2xl
              border border-zinc-800/80 bg-[#111114]/95 p-1.5
              shadow-xl backdrop-blur-xl
            "
          >
            <div className="hidden items-center gap-2 px-3 sm:flex">
              <div
                className="
                  flex h-7 w-7 items-center justify-center rounded-lg
                  border border-zinc-700 bg-zinc-900
                  text-xs font-semibold text-zinc-200
                "
              >
                G
              </div>
              <span className="text-sm font-semibold text-zinc-200">
                Grapix
              </span>
            </div>

            <div className="h-5 w-px bg-zinc-800" />

            {/* Search */}
            <div
              className="
                relative flex w-[min(28vw,320px)] items-center gap-2
                rounded-xl border border-zinc-800 bg-[#09090b] px-3
              "
            >
              <span className="text-zinc-600">⌕</span>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={
                  graphViewMode === "directories"
                    ? "Search directories..."
                    : "Search files..."
                }
                className="
                  h-9 min-w-0 flex-1 bg-transparent text-xs text-zinc-200
                  outline-none placeholder:text-zinc-600
                "
              />

              {search.trim() && (
                <div
                  className="
                    absolute left-0 top-full z-50 mt-2 w-full overflow-hidden
                    rounded-xl border border-zinc-800 bg-[#111114] shadow-2xl
                  "
                >
                  {visibleNodes.filter((node) => {
                    const data = node.data as FileNodeData;
                    const query = search.trim().toLowerCase();
                    const label = String(data?.label ?? "");

                    return (
                      label.toLowerCase().includes(query) ||
                      node.id.toLowerCase().includes(query)
                    );
                  }).length === 0 ? (
                    <div className="px-3 py-4 text-xs text-zinc-600">
                      No files found
                    </div>
                  ) : (
                    visibleNodes
                      .filter((node) => {
                        const data = node.data as FileNodeData;
                        const query = search.trim().toLowerCase();
                        const label = String(data?.label ?? "");

                        return (
                          label.toLowerCase().includes(query) ||
                          node.id.toLowerCase().includes(query)
                        );
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

                              if (data.kind === "directory") {
                                fileRequestController.current?.abort();
                                fileRequestController.current = null;

                                setLoading(false);
                                setGraphViewModeOverride("files");
                                setFocusedGroupId(node.id);
                                setShowIsolated(true);
                                setFocusSelection(true);
                                setSelectedNode(null);
                                setFileAnalysis(null);
                                setAnalysisError(null);
                              } else {
                                void selectFile(node.id);
                              }
                            }}
                            className="
                              block w-full border-b border-zinc-800/60
                              px-3 py-2.5 text-left last:border-0
                              hover:bg-zinc-900
                            "
                          >
                            <div className="truncate text-xs text-zinc-300">
                              {String(data.label ?? node.id)}
                            </div>
                            <div className="mt-0.5 truncate text-[10px] text-zinc-600">
                              {node.id}
                            </div>
                          </button>
                        );
                      })
                  )}
                </div>
              )}

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-xs text-zinc-600 hover:text-zinc-300"
                >
                  ×
                </button>
              )}
            </div>

            {/* Repository */}
            <div
              className="
                flex w-[min(35vw,420px)] items-center gap-2 rounded-xl
                border border-zinc-800 bg-[#09090b] px-3
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
                  h-9 min-w-0 flex-1 bg-transparent text-xs text-zinc-200
                  outline-none placeholder:text-zinc-600
                  disabled:opacity-50
                "
              />
            </div>

            {/* Analyze */}
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={analyzing}
              className="
                h-9 rounded-xl bg-zinc-100 px-4 text-xs font-semibold
                text-zinc-950 transition hover:bg-white
                disabled:cursor-not-allowed disabled:opacity-50
              "
            >
              {analyzing ? "Analyzing..." : "Analyze"}
            </button>

            {nodes.length > 0 && !analyzing && (
              <div className="hidden items-center gap-1.5 px-2 text-[10px] text-zinc-500 lg:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                <span>{stats?.totalFiles ?? nodes.length} files analyzed</span>
              </div>
            )}
          </div>
        </Panel>

        {analyzing && (
          <Panel position="top-center" style={{ marginTop: "78px" }}>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-700/60 bg-[#151517]/95 px-4 py-3 text-xs text-zinc-300 shadow-2xl backdrop-blur-xl">
              <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-200 shadow-[0_0_12px_rgba(255,255,255,0.35)]" />
              <div>
                <div className="font-medium text-zinc-200">
                  Building dependency graph
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">
                  Cloning, parsing, and resolving repository files
                </div>
              </div>
            </div>
          </Panel>
        )}

        {nodes.length > 0 &&
          cycles.length === 0 &&
          analysisId &&
          dismissedNoCycleNoticeFor !== analysisId && (
            <Panel position="top-center" style={{ marginTop: "74px" }}>
              <div className="flex items-center gap-3 rounded-xl border border-zinc-700/60 bg-[#151517]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-300/10 text-sm text-zinc-200">
                  ✓
                </span>
                <div>
                  <div className="text-xs font-medium text-zinc-200">
                    No circular dependencies found
                  </div>
                  <div className="mt-0.5 text-[10px] text-zinc-500">
                    The analyzed graph contains no dependency cycles.
                  </div>
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

        {/* Stats */}
        {nodes.length > 0 && (
          <Panel position="top-left" style={{ marginTop: "76px" }}>
            <div className="w-[292px] max-w-[calc(100vw-32px)] space-y-2">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Analysis overview
              </div>

              <div
                className="
                  grid grid-cols-4 gap-1 rounded-xl
                  border border-zinc-800/80 bg-[#111114]/95 p-1
                  shadow-lg backdrop-blur-xl
                "
              >
                <Stat label="Files" value={stats?.totalFiles ?? nodes.length} />
                <Stat label="Connected" value={connectedCount} />
                <Stat label="Isolated" value={isolatedCount} />
                <Stat label="Cycles" value={cycles.length} />
              </div>

              {stats && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-zinc-800/80 bg-[#111114]/80 px-3 py-2 text-[10px] text-zinc-500 shadow-lg backdrop-blur-xl">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                  <span>{stats.parsedFiles.toLocaleString()} parsed</span>
                  <span className="text-zinc-700">·</span>
                  <span>{stats.resolvedImports.toLocaleString()} imports</span>
                  {stats.failedFiles > 0 && (
                    <span className="text-zinc-300">
                      {stats.failedFiles.toLocaleString()} failed
                    </span>
                  )}
                  {stats.unresolvedImports > 0 && (
                    <span className="text-zinc-300">
                      {stats.unresolvedImports.toLocaleString()} unresolved
                    </span>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-zinc-800/80 bg-[#111114]/90 p-2 shadow-lg backdrop-blur-xl">
                <div className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                  Graph view
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <ViewButton
                    active={graphViewMode === "directories"}
                    onClick={() => {
                      fileRequestController.current?.abort();
                      fileRequestController.current = null;
                      setLoading(false);
                      setGraphViewModeOverride("directories");
                      setFocusedGroupId(null);
                      setSelectedNode(null);
                      setFileAnalysis(null);
                      setAnalysisError(null);
                      setFocusSelection(false);
                    }}
                  >
                    Overview
                  </ViewButton>

                  <ViewButton
                    active={graphViewMode === "files"}
                    onClick={() => {
                      setGraphViewModeOverride("files");
                      setFocusedGroupId(null);
                      setFocusSelection(false);
                    }}
                  >
                    Files
                  </ViewButton>
                </div>

                {graphViewMode === "files" && (
                  <div className="mt-1 grid grid-cols-2 gap-1 border-t border-zinc-800/70 pt-1">
                    <ViewButton
                      active={!showIsolated}
                      onClick={() => setShowIsolated(false)}
                    >
                      Connected
                    </ViewButton>
                    <ViewButton
                      active={showIsolated}
                      onClick={() => setShowIsolated(true)}
                    >
                      All files
                    </ViewButton>
                  </div>
                )}

                {focusedGroupId && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-[10px] text-zinc-500">
                    <span className="truncate">Focused directory</span>
                    <button
                      type="button"
                      className="ml-2 shrink-0 text-zinc-300 hover:text-white"
                      onClick={() => {
                        setFocusedGroupId(null);
                        setFocusSelection(false);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}

                {selectedNode && fileAnalysis && (
                  <button
                    type="button"
                    aria-pressed={focusSelection}
                    onClick={() => setFocusSelection((current) => !current)}
                    className={`mt-1.5 w-full rounded-lg px-2 py-1.5 text-[10px] font-medium transition ${
                      focusSelection
                        ? "bg-zinc-200/10 text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                    }`}
                  >
                    {focusSelection ? "Showing selection" : "Focus selection"}
                  </button>
                )}
              </div>

              {cycles.length > 0 && (
                <div className="rounded-xl border border-zinc-700/70 bg-[#151517]/95 p-2 shadow-lg backdrop-blur-xl">
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                      Circular dependencies
                    </span>
                    {selectedCycle && (
                      <span className="text-[9px] text-zinc-200">
                        {selectedCycle.length} files
                      </span>
                    )}
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
                    className="h-8 w-full rounded-lg border border-zinc-700 bg-[#0c0c0f] px-2 text-[10px] text-zinc-300 outline-none transition focus:border-zinc-300/70"
                    aria-label="Select circular dependency group"
                  >
                    <option value="">Select a cycle...</option>
                    {cycles.map((cycle, index) => (
                      <option
                        key={`${index}-${cycle[0] ?? "cycle"}`}
                        value={index}
                      >
                        Cycle {index + 1} · {cycle.length} files
                      </option>
                    ))}
                  </select>

                  {selectedCycle && (
                    <button
                      type="button"
                      onClick={() => setFocusSelection((current) => !current)}
                      className={`mt-1.5 w-full rounded-lg px-2 py-1.5 text-[10px] font-medium transition ${
                        focusSelection
                          ? "bg-zinc-200/10 text-zinc-100"
                          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                      }`}
                    >
                      {focusSelection ? "Showing cycle" : "Focus this cycle"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Controls */}
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="grapix-controls"
        />

        {/* Mini map */}
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
            <FileInspector
              selectedNode={selectedNode}
              fileAnalysis={fileAnalysis}
              loading={loading}
              error={analysisError}
              onClose={handlePaneClick}
              onFileClick={selectFile}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg px-2.5 py-1.5">
      <div className="text-[9px] font-medium uppercase tracking-wider text-zinc-600">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-semibold tabular-nums text-zinc-300">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        rounded-lg px-3 py-1.5
        text-[11px] font-medium transition
        ${
          active
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-600 hover:text-zinc-300"
        }
      `}
    >
      {children}
    </button>
  );
}
