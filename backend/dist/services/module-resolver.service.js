"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModuleResolver = createModuleResolver;
const path_1 = __importDefault(require("path"));
const enhanced_resolve_1 = __importDefault(require("enhanced-resolve"));
const tsconfig_paths_1 = require("tsconfig-paths");
function createModuleResolver(repositoryPath) {
    const resolver = enhanced_resolve_1.default.create.promise({
        extensions: [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"],
        mainFiles: ["index"],
    });
    const resolutionCache = new Map();
    const tsconfigResult = (0, tsconfig_paths_1.loadConfig)(repositoryPath);
    const matchPath = tsconfigResult.resultType === "success" ? (0, tsconfig_paths_1.createMatchPath)(tsconfigResult.absoluteBaseUrl, tsconfigResult.paths) : null;
    return async function resolveModule(importerFile, importSpecifier) {
        const cacheKey = `${importerFile}\0${importSpecifier}`;
        const cachedResult = resolutionCache.get(cacheKey);
        if (cachedResult !== undefined) {
            return cachedResult;
        }
        const absoluteImporterPath = path_1.default.join(repositoryPath, importerFile);
        const importerDirectory = path_1.default.dirname(absoluteImporterPath);
        const requests = [importSpecifier];
        if ([".js", ".jsx", ".mjs", ".cjs"].some((extension) => importSpecifier.endsWith(extension))) {
            requests.push(importSpecifier.slice(0, importSpecifier.lastIndexOf(".")));
        }
        for (const request of requests) {
            try {
                let resolvedRequest = request;
                if (matchPath) {
                    const matchedPath = matchPath(request, undefined, undefined, [
                        ".ts",
                        ".tsx",
                        ".js",
                        ".jsx",
                        ".mts",
                        ".cts",
                        ".mjs",
                        ".cjs",
                    ]);
                    if (matchedPath) {
                        resolvedRequest = matchedPath;
                    }
                }
                const result = await resolver(importerDirectory, resolvedRequest);
                if (!result) {
                    continue;
                }
                const relativePath = path_1.default.relative(repositoryPath, result);
                if (relativePath.startsWith("..") || path_1.default.isAbsolute(relativePath)) {
                    continue;
                }
                const normalizedPath = relativePath.split(path_1.default.sep).join("/");
                resolutionCache.set(cacheKey, normalizedPath);
                return normalizedPath;
            }
            catch {
                continue;
            }
        }
        resolutionCache.set(cacheKey, null);
        return null;
    };
}
//# sourceMappingURL=module-resolver.service.js.map