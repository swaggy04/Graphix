"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDependencies = getDependencies;
exports.getDependents = getDependents;
exports.getTransitiveDependencies = getTransitiveDependencies;
exports.getTransitiveDependents = getTransitiveDependents;
function getDependencies(graph, file) {
    if (!graph.hasNode(file)) {
        return [];
    }
    return graph.outNeighbors(file);
}
function getDependents(graph, file) {
    if (!graph.hasNode(file)) {
        return [];
    }
    return graph.inNeighbors(file);
}
function getTransitiveDependencies(graph, file) {
    if (!graph.hasNode(file)) {
        return [];
    }
    const visited = new Set();
    const queue = [file];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            continue;
        }
        const dependencies = graph.outNeighbors(current);
        for (const dependency of dependencies) {
            if (visited.has(dependency)) {
                continue;
            }
            visited.add(dependency);
            queue.push(dependency);
        }
    }
    return Array.from(visited);
}
function getTransitiveDependents(graph, file) {
    if (!graph.hasNode(file)) {
        return [];
    }
    const visited = new Set();
    const queue = [file];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            continue;
        }
        const dependents = graph.inNeighbors(current);
        for (const dependent of dependents) {
            if (visited.has(dependent)) {
                continue;
            }
            visited.add(dependent);
            queue.push(dependent);
        }
    }
    return Array.from(visited);
}
//# sourceMappingURL=dependency-query.service.js.map