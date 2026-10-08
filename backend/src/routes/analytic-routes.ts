import { Router } from "express";

import { cloneRepository, cleanupRepository } from "../services/repository.service";
import { discoverSourceFiles } from "../services/file-discovery.service";
import { createDependencyGraph } from "../services/dependency-analyzer.service";
import { createGraphViewModel } from "../services/graph-view-model.service";
import { getAnalysis, storeAnalysis } from "../services/analysis-store.service";
import { analyzeFile } from "../services/file-analysis.service";

/// HTTP orchestration layer.
const router = Router();

router.post("/analyze", async (req, res) => {
  const { repositoryUrl } = req.body;

  if (!repositoryUrl || typeof repositoryUrl !== "string") {
    return res.status(400).json({
      error: "repositoryUrl is required and must be a string",
    });
  }

  let repositoryPath: string | null = null;

  try {
    repositoryPath = await cloneRepository(repositoryUrl);

    const files = await discoverSourceFiles(repositoryPath);

    const { graph, stats } = await createDependencyGraph(repositoryPath, files);

    const analysisId = storeAnalysis(graph);

    const viewModel = createGraphViewModel(graph);

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
  } finally {
    if (repositoryPath) {
      await cleanupRepository(repositoryPath);
    }
  }
});

router.get("/analyze/:analysisId/file/:filePath", async (req, res) => {
  const { analysisId, filePath } = req.params;

  const graph = getAnalysis(analysisId);

  // Analysis does not exist.
  if (!graph) {
    return res.status(404).json({
      error: "Analysis not found",
    });
  }

  try {
    // Analyze the selected file against the stored graph.
    const result = analyzeFile(graph, filePath);

    return res.status(200).json(result);
  } catch (error) {
    console.error("File analysis failed:", error);

    return res.status(500).json({
      error: "Failed to analyze file",
    });
  }
});
export default router;
///
