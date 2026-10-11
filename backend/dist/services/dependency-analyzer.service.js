"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDependencyGraph = createDependencyGraph;
const graphology_1 = __importDefault(require("graphology"));
const ast_parser_service_1 = require("./ast-parser.service");
const module_resolver_service_1 = require("./module-resolver.service");
const import_classifier_1 = require("../utils/import-classifier");
const application_error_1 = require("../utils/application-error");
async function createDependencyGraph(repositoryPath, files, signal) {
    const graph = new graphology_1.default({
        type: "directed",
    });
    const resolveModule = (0, module_resolver_service_1.createModuleResolver)(repositoryPath);
    let parsedFiles = 0;
    let failedFiles = 0;
    let resolvedImports = 0;
    let resolvedInternalImports = 0;
    let externalImports = 0;
    let unresolvedImports = 0;
    let relativeImports = 0;
    let packageImports = 0;
    let builtinImports = 0;
    const unresolvedImportSpecifiers = new Set();
    const unresolvedRelativeImportSpecifiers = new Set();
    for (const file of files) {
        (0, application_error_1.throwIfAborted)(signal);
        graph.addNode(file);
    }
    for (const file of files) {
        (0, application_error_1.throwIfAborted)(signal);
        let imports;
        try {
            imports = await (0, ast_parser_service_1.extractImports)(repositoryPath, file);
            parsedFiles++;
        }
        catch {
            failedFiles++;
            console.log(`Skipped: ${file}`);
            continue;
        }
        for (const imp of imports) {
            (0, application_error_1.throwIfAborted)(signal);
            const kind = (0, import_classifier_1.classifyImport)(imp);
            if (kind === "relative") {
                relativeImports++;
            }
            if (kind === "package") {
                packageImports++;
            }
            if (kind === "builtin") {
                builtinImports++;
            }
            const resolvedFile = await resolveModule(file, imp);
            if (!resolvedFile) {
                if (kind === "relative") {
                    unresolvedImports++;
                    unresolvedImportSpecifiers.add(imp);
                    unresolvedRelativeImportSpecifiers.add(imp);
                }
                continue;
            }
            if (!graph.hasNode(resolvedFile)) {
                externalImports++;
                continue;
            }
            resolvedImports++;
            resolvedInternalImports++;
            if (!graph.hasEdge(file, resolvedFile)) {
                graph.addEdge(file, resolvedFile);
            }
        }
    }
    return {
        graph,
        stats: {
            totalFiles: files.length,
            parsedFiles,
            failedFiles,
            resolvedImports,
            resolvedInternalImports,
            externalImports,
            unresolvedImports,
            relativeImports,
            packageImports,
            builtinImports,
            unresolvedImportSpecifiers: Array.from(unresolvedImportSpecifiers),
            unresolvedRelativeImportSpecifiers: Array.from(unresolvedRelativeImportSpecifiers),
        },
    };
}
//# sourceMappingURL=dependency-analyzer.service.js.map