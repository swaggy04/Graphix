import Graph from "graphology";

export function getDependencies(graph: Graph, file: string): string[] {
  if (!graph.hasNode(file)) {
    return [];
  }

  return graph.outNeighbors(file);
}

export function getDependents(graph: Graph, file: string): string[] {
  if (!graph.hasNode(file)) {
    return [];
  }

  return graph.inNeighbors(file);
}

export function getTransitiveDependencies(
  graph: Graph,
  file: string,
): string[] {
  if (!graph.hasNode(file)) {
    return [];
  }

  const visited = new Set<string>();
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

export function getTransitiveDependents(graph: Graph, file: string): string[] {
  if (!graph.hasNode(file)) {
    return [];
  }

  const visited = new Set<string>();
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
