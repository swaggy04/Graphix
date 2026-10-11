"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const repository_service_1 = require("../services/repository.service");
const file_discovery_service_1 = require("../services/file-discovery.service");
const dependency_analyzer_service_1 = require("../services/dependency-analyzer.service");
const graph_view_model_service_1 = require("../services/graph-view-model.service");
const analysis_store_service_1 = require("../services/analysis-store.service");
const file_analysis_service_1 = require("../services/file-analysis.service");
const cycle_detection_service_1 = require("../services/cycle-detection.service");
const analysis_limiter_service_1 = require("../services/analysis-limiter.service");
const analysis_rate_limit_1 = require("../middleware/analysis-rate-limit");
const runtime_config_1 = require("../config/runtime-config");
const application_error_1 = require("../utils/application-error");
/// HTTP orchestration layer.
const router = (0, express_1.Router)();
const analysisLimiter = new analysis_limiter_service_1.AnalysisLimiter(runtime_config_1.runtimeConfig.maxConcurrentAnalyses);
const analysisRateLimit = (0, analysis_rate_limit_1.createAnalysisRateLimit)({
    maxRequests: runtime_config_1.runtimeConfig.maxAnalysesPerWindow,
    windowMs: runtime_config_1.runtimeConfig.rateLimitWindowMs,
});
router.post("/analyze", analysisRateLimit, async (req, res) => {
    const repositoryUrl = typeof req.body?.repositoryUrl === "string"
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
    let repositoryPath = null;
    let responseSent = false;
    const abortController = new AbortController();
    const timeout = setTimeout(() => {
        abortController.abort(new application_error_1.ApplicationError("ANALYSIS_TIMEOUT", 408, "Repository analysis exceeded the time limit."));
    }, runtime_config_1.runtimeConfig.analysisTimeoutMs);
    const abortForClientDisconnect = () => {
        if (!responseSent && !abortController.signal.aborted) {
            abortController.abort(new application_error_1.ApplicationError("ANALYSIS_CANCELLED", 499, "Repository analysis was cancelled because the client disconnected."));
        }
    };
    req.once("aborted", abortForClientDisconnect);
    res.once("close", abortForClientDisconnect);
    try {
        // 1. Clone repository.
        repositoryPath = await (0, repository_service_1.cloneRepository)(repositoryUrl, abortController.signal);
        // 2. Discover source files.
        const files = await (0, file_discovery_service_1.discoverSourceFiles)(repositoryPath, abortController.signal);
        // 3. Build dependency graph.
        const { graph, stats } = await (0, dependency_analyzer_service_1.createDependencyGraph)(repositoryPath, files, abortController.signal);
        // 4. Detect circular dependencies.
        (0, application_error_1.throwIfAborted)(abortController.signal);
        const cycles = (0, cycle_detection_service_1.detectCycles)(graph);
        // 5. Store the graph for subsequent file-inspector requests.
        const analysisId = (0, analysis_store_service_1.storeAnalysis)(graph);
        // 6. Convert the graph into an API-safe view model.
        const viewModel = (0, graph_view_model_service_1.createGraphViewModel)(graph);
        // 7. Return graph data and cycle information.
        responseSent = true;
        return res.status(200).json({
            nodes: viewModel.nodes,
            edges: viewModel.edges,
            cycles,
            analysisId,
            stats,
        });
    }
    catch (error) {
        console.error("Repository analysis failed:", error);
        const normalizedError = abortController.signal.aborted
            ? abortController.signal.reason ?? error
            : error;
        const applicationError = (0, application_error_1.isApplicationError)(normalizedError)
            ? normalizedError
            : new application_error_1.ApplicationError("REPOSITORY_ANALYSIS_FAILED", 500, "Failed to analyze repository.");
        if (res.headersSent || res.writableEnded) {
            return;
        }
        return res.status(applicationError.statusCode).json({
            error: {
                code: applicationError.code,
                message: applicationError.message,
            },
        });
    }
    finally {
        clearTimeout(timeout);
        req.removeListener("aborted", abortForClientDisconnect);
        res.removeListener("close", abortForClientDisconnect);
        if (repositoryPath) {
            try {
                await (0, repository_service_1.cleanupRepository)(repositoryPath);
            }
            catch (cleanupError) {
                console.error("Repository cleanup failed:", cleanupError);
            }
        }
        releaseAnalysis();
    }
});
router.get("/analyze/:analysisId/file/:filePath", async (req, res) => {
    const { analysisId, filePath } = req.params;
    const graph = (0, analysis_store_service_1.getAnalysis)(analysisId);
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
        const result = (0, file_analysis_service_1.analyzeFile)(graph, filePath);
        return res.status(200).json(result);
    }
    catch (error) {
        console.error("File analysis failed:", error);
        return res.status(500).json({
            error: {
                code: "FILE_ANALYSIS_FAILED",
                message: "Failed to analyze file",
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=analytic-routes.js.map