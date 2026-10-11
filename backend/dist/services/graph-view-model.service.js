"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphViewModel = createGraphViewModel;
function createGraphViewModel(graph) {
    const nodes = graph.nodes().map((node) => ({
        id: node,
        label: node,
    }));
    const edges = graph.edges().map((edge) => ({
        id: edge,
        source: graph.source(edge),
        target: graph.target(edge),
    }));
    return {
        nodes,
        edges,
    };
}
//# sourceMappingURL=graph-view-model.service.js.map