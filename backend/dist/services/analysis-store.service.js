"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeAnalysis = storeAnalysis;
exports.getAnalysis = getAnalysis;
exports.deleteAnalysis = deleteAnalysis;
const crypto_1 = require("crypto");
const runtime_config_1 = require("../config/runtime-config");
const analysisStore = new Map();
function storeAnalysis(graph) {
    const analysisId = (0, crypto_1.randomUUID)();
    const expiresAt = Date.now() + runtime_config_1.runtimeConfig.analysisTtlMs;
    const timer = setTimeout(() => {
        deleteAnalysis(analysisId);
    }, runtime_config_1.runtimeConfig.analysisTtlMs);
    timer.unref?.();
    analysisStore.set(analysisId, { graph, expiresAt, timer });
    while (analysisStore.size > runtime_config_1.runtimeConfig.maxStoredAnalyses) {
        const oldestAnalysisId = analysisStore.keys().next().value;
        if (!oldestAnalysisId) {
            break;
        }
        deleteAnalysis(oldestAnalysisId);
    }
    return analysisId;
}
function getAnalysis(analysisId) {
    const storedAnalysis = analysisStore.get(analysisId);
    if (!storedAnalysis) {
        return undefined;
    }
    if (storedAnalysis.expiresAt <= Date.now()) {
        deleteAnalysis(analysisId);
        return undefined;
    }
    return storedAnalysis.graph;
}
function deleteAnalysis(analysisId) {
    const storedAnalysis = analysisStore.get(analysisId);
    if (!storedAnalysis) {
        return false;
    }
    clearTimeout(storedAnalysis.timer);
    return analysisStore.delete(analysisId);
}
//# sourceMappingURL=analysis-store.service.js.map