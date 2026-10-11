"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFile = analyzeFile;
const dependency_query_service_1 = require("./dependency-query.service");
const impact_analysis_service_1 = require("./impact-analysis.service");
function analyzeFile(graph, file) {
    const directDependencies = (0, dependency_query_service_1.getDependencies)(graph, file);
    const transitiveDependencies = (0, dependency_query_service_1.getTransitiveDependencies)(graph, file);
    const directDependents = (0, dependency_query_service_1.getDependents)(graph, file);
    const transitiveDependents = (0, dependency_query_service_1.getTransitiveDependents)(graph, file);
    const impact = (0, impact_analysis_service_1.analyzeImpact)(graph, file);
    return {
        file,
        dependencies: {
            direct: directDependencies,
            transitive: transitiveDependencies,
        },
        dependents: {
            direct: directDependents,
            transitive: transitiveDependents,
        },
        impact: {
            affectedFiles: impact.affectedFiles,
        },
    };
}
//# sourceMappingURL=file-analysis.service.js.map