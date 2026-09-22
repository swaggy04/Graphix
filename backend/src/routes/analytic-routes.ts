import { Router } from "express";

import { cloneRepository } from "../services/repository.service";
import { discoverSourceFiles } from "../services/file-discovery.service";
import { createDependencyGraph } from "../services/dependency-analyzer.service";
import { createGraphViewModel } from "../services/graph-view-model.service";
import { storeAnalysis } from "../services/analysis-store.service";

/// HTTP orchestration layer.
const router = Router();

router.post("/analyze", async (req, res) => {
  const { repositoryUrl } = req.body;

  // Validate request input.
  if (!repositoryUrl || typeof repositoryUrl !== "string") {
    return res.status(400).json({
      error: "repositoryUrl is required and must be a string",
    });
  }

  try {
    // 1. Clone repository.
    const repositoryPath = await cloneRepository(repositoryUrl);

    // 2. Discover source files.
    const files = await discoverSourceFiles(repositoryPath);

    // 3. Analyze repository and build dependency graph.
    const { graph, stats } = await createDependencyGraph(repositoryPath, files);
    const analysisId = storeAnalysis(graph);
    // 4. Convert internal graph into API-safe view model.
    const viewModel = createGraphViewModel(graph);

    // 5. Return graph data to the client.
    return res.status(200).json({
      nodes: viewModel.nodes,
      edges: viewModel.edges,
      analysisId,
      stats,
    });
  } catch (error) {
    console.error("Repository analysis failed:", error);

    return res.status(500).json({
      error: "Failed to analyze repository",
    });
  }
});

export default router;
