"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImpact = analyzeImpact;
const dependency_query_service_1 = require("./dependency-query.service");
function analyzeImpact(graph, changedFile) {
    if (!graph.hasNode(changedFile)) {
        return {
            changedFile,
            affectedFiles: [],
        };
    }
    const affectedFiles = (0, dependency_query_service_1.getTransitiveDependents)(graph, changedFile);
    return {
        changedFile,
        affectedFiles,
    };
}
//# sourceMappingURL=impact-analysis.service.js.map