"use client";

import { useState } from "react";
import GraphCanvas from "../components/GraphCanvas";
import { createReactFlowGraph } from "../lib/graph-adapter";
import { analyzeRepository } from "../lib/api";
import type { Edge, Node } from "@xyflow/react";

export default function Home() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    const url = repositoryUrl.trim();

    if (!url) {
      setError("Repository URL is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clear the previous graph while a new analysis is running.
      setNodes([]);
      setEdges([]);
      setAnalysisId(null);

      const graphViewModel = await analyzeRepository(url);

      const graph = createReactFlowGraph(graphViewModel);

      setNodes(graph.nodes);
      setEdges(graph.edges);
      setAnalysisId(graphViewModel.analysisId);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to analyze repository",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen w-full overflow-hidden bg-[#09090b]">
      {/* Error message */}
      {error && (
        <div className="absolute left-1/2 top-5 z-100 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border border-red-500/20 bg-red-950/90 px-4 py-3 text-sm text-red-300 shadow-2xl backdrop-blur">
          <span>{error}</span>

          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-400 transition hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}

      <GraphCanvas
        nodes={nodes}
        edges={edges}
        analysisId={analysisId}
        repositoryUrl={repositoryUrl}
        setRepositoryUrl={setRepositoryUrl}
        onAnalyze={handleAnalyze}
        analyzing={loading}
      />
    </main>
  );
}
