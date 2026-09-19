import Graph from "graphology";

export interface DependencyAnalysis {
  graph: Graph;
}
export function createDependencyGraph(files: string[]): DependencyAnalysis {
  const graph = new Graph({
    type: "directed",
  });

  for (const file of files) {
    graph.addNode(file);
  }

  return { graph };
}
