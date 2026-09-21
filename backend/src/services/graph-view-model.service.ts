import Graph from "graphology";

export interface GraphViewNode {
  id: string;
  label: string;
}

export interface GraphViewEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphViewModel {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}

export function createGraphViewModel(graph: Graph): GraphViewModel {
  const nodes: GraphViewNode[] = graph.nodes().map((node) => ({
    id: node,
    label: node,
  }));
  const edges: GraphViewEdge[] = graph.edges().map((edge) => ({
    id: edge,
    source: graph.source(edge),
    target: graph.target(edge),
  }));
  return {
    nodes,
    edges,
  };
}
