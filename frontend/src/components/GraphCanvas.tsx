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
  type ReactFlowInstance,
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

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasContent {...props} />
    </ReactFlowProvider>
  );
}

function GraphCanvasContent({
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

  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  /*
   * ---------------------------------------------------------
   * ANALYZE FILE
   * ---------------------------------------------------------
   */

  const analyzeFile = async (node: Node) => {
    if (!analysisId) {
      return;
    }

    setSelectedNode(node);
    setFileAnalysis(null);
    setLoading(true);

    /*
     * Focus the graph on the selected node.
     */
    if (reactFlowInstance) {
      reactFlowInstance.setCenter(
        node.position.x + (node.measured?.width ?? 180) / 2,
        node.position.y + (node.measured?.height ?? 50) / 2,
        {
          zoom: 1.1,
          duration: 400,
        },
      );
    }

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

      /*
       * Highlight:
       *
       * selected file
       * + direct dependencies
       * + direct dependents
       */
      const relatedFiles = new Set<string>([
        node.id,
        ...data.dependencies.direct,
        ...data.dependents.direct,
      ]);

      setHighlightedNodes(relatedFiles);
    } catch (error) {
      console.error("File analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * GRAPH NODE CLICK
   * ---------------------------------------------------------
   */

  const handleNodeClick = async (_event: React.MouseEvent, node: Node) => {
    await analyzeFile(node);
  };

  /*
   * ---------------------------------------------------------
   * PANEL CLICK
   * ---------------------------------------------------------
   */

  const handleFileClick = async (file: string) => {
    const node = nodes.find((node) => node.id === file);

    if (!node) {
      console.warn(`Node not found: ${file}`);
      return;
    }

    await analyzeFile(node);
  };

  /*
   * ---------------------------------------------------------
   * CLEAR SELECTION
   * ---------------------------------------------------------
   */

  const handlePaneClick = () => {
    setSelectedNode(null);
    setFileAnalysis(null);
    setHighlightedNodes(new Set());
  };

  /*
   * ---------------------------------------------------------
   * VISUAL NODE STATE
   * ---------------------------------------------------------
   */

  const displayNodes = nodes.map((node) => {
    const isSelected = selectedNode?.id === node.id;

    const isHighlighted = highlightedNodes.has(node.id);

    const hasSelection = highlightedNodes.size > 0;

    const isDimmed = hasSelection && !isSelected && !isHighlighted;

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

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#09090b]">
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={setReactFlowInstance}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.1,
        }}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: {
            stroke: "#3f3f46",
            strokeWidth: 1.5,
          },
        }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{
          hideAttribution: true,
        }}
      >
        {/* ================================================= */}
        {/* BACKGROUND */}
        {/* ================================================= */}

        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="#3f3f46"
        />

        {/* ================================================= */}
        {/* CONTROLS */}
        {/* ================================================= */}

        <Controls
          position="bottom-left"
          showInteractive={false}
          className="
            !m-4
            !overflow-hidden
            !rounded-xl
            !border
            !border-zinc-800
            !bg-[#111113]
            !shadow-2xl
          "
        />

        {/* ================================================= */}
        {/* MINIMAP */}
        {/* ================================================= */}

        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          className="
            !m-4
            !overflow-hidden
            !rounded-xl
            !border
            !border-zinc-800
          "
          bgColor="#09090b"
          maskColor="rgba(9, 9, 11, 0.75)"
          nodeColor="#3f3f46"
          nodeStrokeColor="#71717a"
          nodeStrokeWidth={1}
        />

        {/* ================================================= */}
        {/* REPOSITORY SEARCH */}
        {/* ================================================= */}

        <Panel position="top-center">
          <div
            className="
              flex
              items-center
              gap-2
              rounded-xl
              border
              border-zinc-800
              bg-[#111113]/95
              p-2
              shadow-2xl
              backdrop-blur
            "
          >
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
                w-[420px]
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

        {/* ================================================= */}
        {/* GRAPH INFO */}
        {/* ================================================= */}

        {nodes.length > 0 && (
          <Panel position="top-left">
            <div
              className="
                rounded-xl
                border
                border-zinc-800
                bg-[#111113]/95
                px-4
                py-3
                shadow-xl
                backdrop-blur
              "
            >
              <div
                className="
                  text-[10px]
                  font-medium
                  uppercase
                  tracking-[0.15em]
                  text-zinc-600
                "
              >
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

        {/* ================================================= */}
        {/* SELECTED FILE */}
        {/* ================================================= */}

        {selectedNode && (
          <Panel position="top-right">
            <div
              className="
                w-80
                overflow-hidden
                rounded-xl
                border
                border-zinc-800
                bg-[#111113]
                shadow-2xl
              "
            >
              {/* Header */}

              <div className="border-b border-zinc-800 px-5 py-4">
                <div
                  className="
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-wider
                    text-zinc-600
                  "
                >
                  Selected file
                </div>

                <div
                  className="
                    mt-1
                    break-all
                    text-sm
                    font-medium
                    text-zinc-100
                  "
                >
                  {selectedNode.id}
                </div>
              </div>

              {/* Loading */}

              {loading && (
                <div className="px-5 py-6 text-sm text-zinc-500">
                  Analyzing file...
                </div>
              )}

              {/* Analysis */}

              {fileAnalysis && !loading && (
                <div className="max-h-[70vh] overflow-y-auto">
                  <AnalysisSection
                    title="Dependencies"
                    direct={fileAnalysis.dependencies.direct}
                    transitive={fileAnalysis.dependencies.transitive}
                    onFileClick={handleFileClick}
                  />

                  <AnalysisSection
                    title="Dependents"
                    direct={fileAnalysis.dependents.direct}
                    transitive={fileAnalysis.dependents.transitive}
                    onFileClick={handleFileClick}
                  />

                  {/* Impact */}

                  <div className="border-t border-zinc-800 px-5 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-100">
                        Impact
                      </h3>

                      <span
                        className="
                          rounded-full
                          bg-zinc-800
                          px-2
                          py-1
                          text-xs
                          text-zinc-400
                        "
                      >
                        {fileAnalysis.impact.affectedFiles.length}
                      </span>
                    </div>

                    {fileAnalysis.impact.affectedFiles.length === 0 ? (
                      <p className="text-xs text-zinc-600">
                        No affected files.
                      </p>
                    ) : (
                      <FileList
                        files={fileAnalysis.impact.affectedFiles}
                        onFileClick={handleFileClick}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

/* ========================================================= */
/* ANALYSIS SECTION */
/* ========================================================= */

function AnalysisSection({
  title,
  direct,
  transitive,
  onFileClick,
}: {
  title: string;
  direct: string[];
  transitive: string[];
  onFileClick: (file: string) => void;
}) {
  return (
    <div className="border-t border-zinc-800 px-5 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>

        <span
          className="
            rounded-full
            bg-zinc-800
            px-2
            py-1
            text-xs
            text-zinc-500
          "
        >
          {direct.length + transitive.length}
        </span>
      </div>

      {/* Direct */}

      <div>
        <div
          className="
            mb-2
            text-[10px]
            font-medium
            uppercase
            tracking-wider
            text-zinc-600
          "
        >
          Direct
        </div>

        {direct.length === 0 ? (
          <p className="text-xs text-zinc-600">None</p>
        ) : (
          <FileList files={direct} onFileClick={onFileClick} />
        )}
      </div>

      {/* Transitive */}

      <div className="mt-4">
        <div
          className="
            mb-2
            text-[10px]
            font-medium
            uppercase
            tracking-wider
            text-zinc-600
          "
        >
          Transitive
        </div>

        {transitive.length === 0 ? (
          <p className="text-xs text-zinc-600">None</p>
        ) : (
          <FileList files={transitive} onFileClick={onFileClick} />
        )}
      </div>
    </div>
  );
}

/* ========================================================= */
/* FILE LIST */
/* ========================================================= */

function FileList({
  files,
  onFileClick,
}: {
  files: string[];
  onFileClick: (file: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {files.map((file) => (
        <button
          key={file}
          type="button"
          onClick={() => onFileClick(file)}
          className="
            block
            w-full
            cursor-pointer
            rounded-lg
            border
            border-zinc-800
            bg-zinc-900/50
            px-3
            py-2
            text-left
            text-xs
            text-zinc-400
            transition
            hover:border-zinc-600
            hover:bg-zinc-800
            hover:text-zinc-200
          "
        >
          <span className="break-all">{file}</span>
        </button>
      ))}
    </div>
  );
}
