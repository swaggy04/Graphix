import { Router } from "express";

import { cloneRepository, cleanupRepository } from "../services/repository.service";
import { discoverSourceFiles } from "../services/file-discovery.service";
import { createDependencyGraph } from "../services/dependency-analyzer.service";
import { createGraphViewModel } from "../services/graph-view-model.service";
import { getAnalysis, storeAnalysis } from "../services/analysis-store.service";
import { analyzeFile } from "../services/file-analysis.service";
import { detectCycles } from "../services/cycle-detection.service";
import { AnalysisLimiter } from "../services/analysis-limiter.service";
import { createAnalysisRateLimit } from "../middleware/analysis-rate-limit";
import { runtimeConfig } from "../config/runtime-config";
import {
  ApplicationError,
  isApplicationError,
  throwIfAborted,
} from "../utils/application-error";

/// HTTP orchestration layer.
const router = Router();
const analysisLimiter = new AnalysisLimiter(runtimeConfig.maxConcurrentAnalyses);
const analysisRateLimit = createAnalysisRateLimit({
  maxRequests: runtimeConfig.maxAnalysesPerWindow,
  windowMs: runtimeConfig.rateLimitWindowMs,
});

router.post("/analyze", analysisRateLimit, async (req, res) => {
  const repositoryUrl =
    typeof req.body?.repositoryUrl === "string"
      ? req.body.repositoryUrl.trim()
      : req.body?.repositoryUrl;

  if (!repositoryUrl || typeof repositoryUrl !== "string") {
    return res.status(400).json({
      error: {
        code: "INVALID_REQUEST",
        message: "repositoryUrl is required and must be a string",
      },
    });
  }

  const releaseAnalysis = analysisLimiter.tryAcquire();

  if (!releaseAnalysis) {
    return res.status(429).json({
      error: {
        code: "ANALYSIS_CAPACITY_EXCEEDED",
        message: "The server is already analyzing the maximum number of repositories.",
      },
    });
  }

  let repositoryPath: string | null = null;
  let responseSent = false;
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort(
      new ApplicationError(
        "ANALYSIS_TIMEOUT",
        408,
        "Repository analysis exceeded the time limit.",
      ),
    );
  }, runtimeConfig.analysisTimeoutMs);

  const abortForClientDisconnect = () => {
    if (!responseSent && !abortController.signal.aborted) {
      abortController.abort(
        new ApplicationError(
          "ANALYSIS_CANCELLED",
          499,
          "Repository analysis was cancelled because the client disconnected.",
        ),
      );
    }
  };

  req.once("aborted", abortForClientDisconnect);
  res.once("close", abortForClientDisconnect);

  try {
    // 1. Clone repository.
    repositoryPath = await cloneRepository(repositoryUrl, abortController.signal);

    // 2. Discover source files.
    const files = await discoverSourceFiles(repositoryPath, abortController.signal);

    // 3. Build dependency graph.
    const { graph, stats } = await createDependencyGraph(
      repositoryPath,
      files,
      abortController.signal,
    );

    // 4. Detect circular dependencies.
    throwIfAborted(abortController.signal);
    const cycles = detectCycles(graph);

    // 5. Store the graph for subsequent file-inspector requests.
    const analysisId = storeAnalysis(graph);

    // 6. Convert the graph into an API-safe view model.
    const viewModel = createGraphViewModel(graph);

    // 7. Return graph data and cycle information.
    responseSent = true;

    return res.status(200).json({
      nodes: viewModel.nodes,
      edges: viewModel.edges,
      cycles,
      analysisId,
      stats,
    });
  } catch (error) {
    console.error("Repository analysis failed:", error);

    const normalizedError = abortController.signal.aborted
      ? abortController.signal.reason ?? error
      : error;

    const applicationError = isApplicationError(normalizedError)
      ? normalizedError
      : new ApplicationError(
          "REPOSITORY_ANALYSIS_FAILED",
          500,
          "Failed to analyze repository.",
        );

    if (res.headersSent || res.writableEnded) {
      return;
    }

    return res.status(applicationError.statusCode).json({
      error: {
        code: applicationError.code,
        message: applicationError.message,
      },
    });
  } finally {
    clearTimeout(timeout);
    req.removeListener("aborted", abortForClientDisconnect);
    res.removeListener("close", abortForClientDisconnect);

    if (repositoryPath) {
      try {
        await cleanupRepository(repositoryPath);
      } catch (cleanupError) {
        console.error("Repository cleanup failed:", cleanupError);
      }
    }

    releaseAnalysis();
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

  if (!graph.hasNode(filePath)) {
    return res.status(404).json({
      error: {
        code: "FILE_NOT_FOUND",
        message: "The requested file is not part of this analysis.",
      },
    });
  }

  try {
    // Analyze the selected file against the stored graph.
    const result = analyzeFile(graph, filePath);

    return res.status(200).json(result);
  } catch (error) {
    console.error("File analysis failed:", error);

    return res.status(500).json({
      error: {
        code: "FILE_ANALYSIS_FAILED",
        message: "Failed to analyze file",
      },
    });
  }
});

export default router;
