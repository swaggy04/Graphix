"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCycles = detectCycles;
const graphology_components_1 = require("graphology-components");
function detectCycles(graph) {
    const components = (0, graphology_components_1.stronglyConnectedComponents)(graph);
    return components
        .filter((component) => {
        if (component.length > 1) {
            return true;
        }
        const node = component[0];
        return node !== undefined && graph.hasEdge(node, node);
    })
        .map((component) => [...component].sort((a, b) => a.localeCompare(b)))
        .sort((a, b) => {
        if (a.length !== b.length) {
            return b.length - a.length;
        }
        return (a[0] ?? "").localeCompare(b[0] ?? "");
    });
}
//# sourceMappingURL=cycle-detection.service.js.map