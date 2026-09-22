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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!repositoryUrl.trim()) {
      setError("Repository URL is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const graphViewModel = await analyzeRepository(repositoryUrl.trim());

      const graph = createReactFlowGraph(graphViewModel);

      setNodes(graph.nodes);
      setEdges(graph.edges);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to analyze repository",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full">
      <div className="  top-4 z-10 flex gap-2 rounded-lg bg-white p-3 shadow">
        <input
          type="text"
          value={repositoryUrl}
          onChange={(event) => setRepositoryUrl(event.target.value)}
          placeholder="https://github.com/owner/repository"
          className="w-96 rounded border px-3 py-2 text-sm text-gray-900 outline-none"
        />

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && (
        <div className="absolute left-4 top-20 z-10 rounded bg-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <GraphCanvas nodes={nodes} edges={edges} />
    </div>
  );
}
