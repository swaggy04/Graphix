"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisLimiter = void 0;
class AnalysisLimiter {
    maxConcurrentAnalyses;
    activeAnalyses = 0;
    constructor(maxConcurrentAnalyses) {
        this.maxConcurrentAnalyses = maxConcurrentAnalyses;
    }
    tryAcquire() {
        if (this.activeAnalyses >= this.maxConcurrentAnalyses) {
            return null;
        }
        this.activeAnalyses += 1;
        let released = false;
        return () => {
            if (released) {
                return;
            }
            released = true;
            this.activeAnalyses -= 1;
        };
    }
}
exports.AnalysisLimiter = AnalysisLimiter;
//# sourceMappingURL=analysis-limiter.service.js.map