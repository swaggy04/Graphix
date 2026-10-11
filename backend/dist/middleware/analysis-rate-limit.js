"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalysisRateLimit = createAnalysisRateLimit;
const application_error_1 = require("../utils/application-error");
function createAnalysisRateLimit(options) {
    const entries = new Map();
    return (req, _res, next) => {
        const now = Date.now();
        const clientKey = req.ip || req.socket.remoteAddress || "unknown";
        for (const [key, entry] of entries) {
            if (now - entry.windowStartedAt >= options.windowMs) {
                entries.delete(key);
            }
        }
        const current = entries.get(clientKey);
        if (!current || now - current.windowStartedAt >= options.windowMs) {
            entries.set(clientKey, {
                count: 1,
                windowStartedAt: now,
            });
            next();
            return;
        }
        if (current.count >= options.maxRequests) {
            next(new application_error_1.ApplicationError("RATE_LIMIT_EXCEEDED", 429, "Too many repository analyses. Please try again later."));
            return;
        }
        current.count += 1;
        next();
    };
}
//# sourceMappingURL=analysis-rate-limit.js.map