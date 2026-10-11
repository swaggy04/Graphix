"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyImport = classifyImport;
const node_module_1 = require("node:module");
const NODE_BUILTINS = new Set(node_module_1.builtinModules.flatMap((moduleName) => [
    moduleName,
    moduleName.startsWith("node:") ? moduleName.slice(5) : `node:${moduleName}`,
]));
function classifyImport(importSpecifier) {
    if (importSpecifier.startsWith("./") || importSpecifier.startsWith("../")) {
        return "relative";
    }
    if (importSpecifier.startsWith("node:") ||
        NODE_BUILTINS.has(importSpecifier)) {
        return "builtin";
    }
    return "package";
}
//# sourceMappingURL=import-classifier.js.map