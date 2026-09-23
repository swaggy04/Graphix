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
  analysisId: string;
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}

export function createReactFlowGraph(viewModel: GraphViewModel): {
  nodes: Node[];
  edges: Edge[];
} {
  const children = new Map<string, string[]>();
  const incoming = new Map<string, number>();

  // --------------------------------------------------
  // Build graph relationships
  // --------------------------------------------------

  for (const node of viewModel.nodes) {
    children.set(node.id, []);
    incoming.set(node.id, 0);
  }

  for (const edge of viewModel.edges) {
    children.get(edge.source)?.push(edge.target);

    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }

  // --------------------------------------------------
  // Find root nodes
  // --------------------------------------------------

  const roots = viewModel.nodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id);

  // Handle completely cyclic graphs
  if (roots.length === 0 && viewModel.nodes.length > 0) {
    roots.push(viewModel.nodes[0].id);
  }

  // --------------------------------------------------
  // Layout
  // --------------------------------------------------

  const positions = new Map<
    string,
    {
      x: number;
      y: number;
    }
  >();

  const visited = new Set<string>();

  // These control the tree spacing.
  const horizontalSpacing = 240;
  const verticalSpacing = 160;

  let nextX = 0;

  function layoutTree(nodeId: string, level: number): number {
    if (visited.has(nodeId)) {
      return positions.get(nodeId)?.x ?? 0;
    }

    visited.add(nodeId);

    const nodeChildren = children.get(nodeId) ?? [];

    // -----------------------------
    // Leaf
    // -----------------------------

    if (nodeChildren.length === 0) {
      const x = nextX;

      nextX += horizontalSpacing;

      positions.set(nodeId, {
        x,
        y: level * verticalSpacing,
      });

      return x;
    }

    // -----------------------------
    // Children first
    // -----------------------------

    const childPositions = nodeChildren.map((child) =>
      layoutTree(child, level + 1),
    );

    // -----------------------------
    // Center parent over children
    // -----------------------------

    const minX = Math.min(...childPositions);
    const maxX = Math.max(...childPositions);

    const x = (minX + maxX) / 2;

    positions.set(nodeId, {
      x,
      y: level * verticalSpacing,
    });

    return x;
  }

  // Layout all roots
  for (const root of roots) {
    layoutTree(root, 0);
  }

  // Layout disconnected nodes
  for (const node of viewModel.nodes) {
    if (!visited.has(node.id)) {
      layoutTree(node.id, 0);
    }
  }

  // --------------------------------------------------
  // React Flow nodes
  // --------------------------------------------------

  const nodes: Node[] = viewModel.nodes.map((node) => {
    const position = positions.get(node.id) ?? {
      x: 0,
      y: 0,
    };

    return {
      id: node.id,

      type: "file",

      position,

      data: {
        label: node.label,
      },
    };
  });

  // --------------------------------------------------
  // React Flow edges
  // --------------------------------------------------

  const edges: Edge[] = viewModel.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",

    style: {
      stroke: "#52525b",
      strokeWidth: 1.5,
    },
  }));
  return {
    nodes,
    edges,
  };
}
