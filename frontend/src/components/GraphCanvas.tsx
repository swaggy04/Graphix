"use client";

import { useState } from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";

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

export default function GraphCanvas({
  nodes,
  edges,
  analysisId,
  repositoryUrl,
  setRepositoryUrl,
  onAnalyze,
  analyzing,
}: GraphCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [fileAnalysis, setFileAnalysis] = useState<FileAnalysis | null>(null);

  const [loading, setLoading] = useState(false);

  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set(),
  );

  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(
    new Set(),
  );

  const handleNodeClick = async (_event: React.MouseEvent, node: Node) => {
    if (!analysisId) {
      return;
    }

    setSelectedNode(node);
    setFileAnalysis(null);
    setLoading(true);

    try {
      const encodedFilePath = encodeURIComponent(node.id);

      const response = await fetch(
        `http://localhost:3001/api/analyze/${analysisId}/file/${encodedFilePath}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch file analysis");
      }

      const data: FileAnalysis = await response.json();

      setFileAnalysis(data);

      // ------------------------------------------
      // Highlight selected + direct relationships
      // ------------------------------------------

      const relatedFiles = new Set<string>([
        node.id,
        ...data.dependencies.direct,
        ...data.dependents.direct,
      ]);

      setHighlightedNodes(relatedFiles);

      // ------------------------------------------
      // Highlight edges connected to selected node
      // ------------------------------------------

      const relatedEdges = new Set<string>();

      for (const edge of edges) {
        if (edge.source === node.id || edge.target === node.id) {
          relatedEdges.add(edge.id);
        }
      }

      setHighlightedEdges(relatedEdges);
    } catch (error) {
      console.error("File analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
    setFileAnalysis(null);

    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
  };

  // ------------------------------------------
  // Update node appearance
  // ------------------------------------------

  const displayNodes: Node[] = nodes.map((node) => {
    const isSelected = selectedNode?.id === node.id;

    const isHighlighted = highlightedNodes.has(node.id);

    /*
     * IMPORTANT:
     *
     * Previously this was around 0.3 which made
     * unrelated nodes almost disappear.
     *
     * We keep them visible at ~70%.
     */
    const isDimmed = selectedNode !== null && !isSelected && !isHighlighted;

    return {
      ...node,

      data: {
        ...node.data,

        selected: isSelected,

        highlighted: isHighlighted,

        dimmed: isDimmed,
      },
    };
  });

  // ------------------------------------------
  // Update edge appearance
  // ------------------------------------------

  const displayEdges: Edge[] = edges.map((edge) => {
    const isHighlighted = highlightedEdges.has(edge.id);

    /*
     * When nothing is selected:
     * keep normal graph edges.
     *
     * When a node is selected:
     * connected edges become stronger.
     * Other edges remain visible.
     */

    if (!selectedNode) {
      return {
        ...edge,

        animated: false,

        style: {
          stroke: "#52525b",
          strokeWidth: 1.5,
          strokeDasharray: "6 5",
          opacity: 0.7,
        },
      };
    }

    if (isHighlighted) {
      return {
        ...edge,

        animated: true,

        style: {
          stroke: "#a1a1aa",
          strokeWidth: 2,
          strokeDasharray: "6 5",
          opacity: 1,
        },
      };
    }

    return {
      ...edge,

      animated: false,

      style: {
        stroke: "#3f3f46",
        strokeWidth: 1.5,
        strokeDasharray: "6 5",
        opacity: 0.35,
      },
    };
  });

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full bg-[#09090b]">
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            maxZoom: 1.1,
          }}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          defaultEdgeOptions={{
            type: "smoothstep",
          }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{
            hideAttribution: true,
          }}
        >
          {/* Background */}

          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.5}
            color="#3f3f46"
          />

          {/* Controls */}

          <Controls position="bottom-left" showInteractive={false} />

          {/* MiniMap */}

          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            bgColor="#111113"
            maskColor="rgba(9, 9, 11, 0.7)"
            nodeColor="#3f3f46"
            nodeStrokeColor="#52525b"
            nodeStrokeWidth={1}
          />

          {/* Repository Search */}

          <Panel position="top-center">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#111113]/95 p-2 shadow-2xl backdrop-blur">
              <input
                type="text"
                value={repositoryUrl}
                onChange={(event) => setRepositoryUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !analyzing) {
                    void onAnalyze();
                  }
                }}
                placeholder="https://github.com/owner/repository"
                disabled={analyzing}
                className="
                  w-105
                  rounded-lg
                  border
                  border-zinc-800
                  bg-[#09090b]
                  px-4
                  py-2.5
                  text-sm
                  text-zinc-200
                  outline-none
                  placeholder:text-zinc-600
                  focus:border-zinc-600
                  disabled:opacity-50
                "
              />

              <button
                onClick={() => void onAnalyze()}
                disabled={analyzing}
                className="
                  rounded-lg
                  bg-zinc-100
                  px-5
                  py-2.5
                  text-sm
                  font-medium
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

          {/* Graph Information */}

          {nodes.length > 0 && (
            <Panel position="top-left">
              <div className="rounded-xl border border-zinc-800 bg-[#111113]/95 px-4 py-3 shadow-xl">
                <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-600">
                  Grapix
                </div>

                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  Dependency Graph
                </div>

                <div className="mt-1 text-xs text-zinc-500">
                  {nodes.length} files · {edges.length} dependencies
                </div>
              </div>
            </Panel>
          )}

          {/* Selected File */}

          {selectedNode && (
            <Panel position="top-right">
              <div className="w-80 overflow-hidden rounded-xl border border-zinc-800 bg-[#111113] shadow-2xl">
                <div className="border-b border-zinc-800 px-5 py-4">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Selected file
                  </div>

                  <div className="mt-1 break-all text-sm font-medium text-zinc-100">
                    {selectedNode.id}
                  </div>
                </div>

                {loading && (
                  <div className="px-5 py-6 text-sm text-zinc-500">
                    Analyzing file...
                  </div>
                )}

                {fileAnalysis && !loading && (
                  <div className="max-h-[70vh] overflow-y-auto">
                    <AnalysisSection
                      title="Dependencies"
                      direct={fileAnalysis.dependencies.direct}
                      transitive={fileAnalysis.dependencies.transitive}
                    />

                    <AnalysisSection
                      title="Dependents"
                      direct={fileAnalysis.dependents.direct}
                      transitive={fileAnalysis.dependents.transitive}
                    />

                    <div className="border-t border-zinc-800 px-5 py-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-100">
                          Impact
                        </h3>

                        <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
                          {fileAnalysis.impact.affectedFiles.length}
                        </span>
                      </div>

                      {fileAnalysis.impact.affectedFiles.length === 0 ? (
                        <p className="text-xs text-zinc-600">
                          No affected files.
                        </p>
                      ) : (
                        <FileList files={fileAnalysis.impact.affectedFiles} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}

function AnalysisSection({
  title,
  direct,
  transitive,
}: {
  title: string;
  direct: string[];
  transitive: string[];
}) {
  return (
    <div className="border-t border-zinc-800 px-5 py-4 first:border-t-0">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>

        <span className="rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-500">
          {direct.length + transitive.length}
        </span>
      </div>

      <div>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Direct
        </div>

        {direct.length === 0 ? (
          <p className="text-xs text-zinc-600">None</p>
        ) : (
          <FileList files={direct} />
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Transitive
        </div>

        {transitive.length === 0 ? (
          <p className="text-xs text-zinc-600">None</p>
        ) : (
          <FileList files={transitive} />
        )}
      </div>
    </div>
  );
}

function FileList({ files }: { files: string[] }) {
  return (
    <div className="space-y-1.5">
      {files.map((file) => (
        <div
          key={file}
          className="
            rounded-lg
            border
            border-zinc-800
            bg-zinc-900/50
            px-3
            py-2
            text-xs
            text-zinc-400
          "
        >
          <span className="break-all">{file}</span>
        </div>
      ))}
    </div>
  );
}
