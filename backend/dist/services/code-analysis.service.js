"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeRepo = analyzeRepo;
const file_discovery_service_1 = require("./file-discovery.service");
const ast_parser_service_1 = require("./ast-parser.service");
async function analyzeRepo(repositoryPath) {
    const sourceFiles = await (0, file_discovery_service_1.discoverSourceFiles)(repositoryPath);
    const results = [];
    for (const file of sourceFiles) {
        try {
            const imports = await (0, ast_parser_service_1.extractImports)(repositoryPath, file);
            results.push({
                path: file,
                imports,
            });
        }
        catch (error) {
            results.push({
                path: file,
                imports: [],
                error: error instanceof Error ? error.message : "Unknown parsing error",
            });
        }
    }
    return results;
}
//# sourceMappingURL=code-analysis.service.js.map