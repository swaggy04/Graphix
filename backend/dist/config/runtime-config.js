"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtimeConfig = void 0;
function positiveInteger(name, fallback) {
    const rawValue = process.env[name];
    if (rawValue === undefined) {
        return fallback;
    }
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return value;
}
exports.runtimeConfig = {
    port: positiveInteger("PORT", 3001),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    cloneTimeoutMs: positiveInteger("CLONE_TIMEOUT_MS", 60 * 1000),
    maxCloneSizeBytes: positiveInteger("MAX_CLONE_SIZE_BYTES", 500 * 1024 * 1024),
    analysisTimeoutMs: positiveInteger("ANALYSIS_TIMEOUT_MS", 5 * 60 * 1000),
    maxConcurrentAnalyses: positiveInteger("MAX_CONCURRENT_ANALYSES", 2),
    rateLimitWindowMs: positiveInteger("RATE_LIMIT_WINDOW_MS", 60 * 1000),
    maxAnalysesPerWindow: positiveInteger("MAX_ANALYSES_PER_WINDOW", 10),
    maxStoredAnalyses: positiveInteger("MAX_STORED_ANALYSES", 100),
    analysisTtlMs: positiveInteger("ANALYSIS_TTL_MS", 30 * 60 * 1000),
    maxSourceFiles: positiveInteger("MAX_SOURCE_FILES", 10_000),
    maxSourceSizeBytes: positiveInteger("MAX_SOURCE_SIZE_BYTES", 100 * 1024 * 1024),
};
//# sourceMappingURL=runtime-config.js.map