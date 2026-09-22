import type { Edge, Node } from "@xyflow/react";

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

export function createReactFlowGraph(viewModel: GraphViewModel): {
  nodes: Node[];
  edges: Edge[];
} {
  const horizontalSpacing = 300;
  const verticalSpacing = 150;

  const nodes: Node[] = viewModel.nodes.map((node, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);

    return {
      id: node.id,
      position: {
        x: column * horizontalSpacing,
        y: row * verticalSpacing,
      },
      data: {
        label: node.label,
      },
    };
  });

  const edges: Edge[] = viewModel.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));

  return {
    nodes,
    edges,
  };
}
