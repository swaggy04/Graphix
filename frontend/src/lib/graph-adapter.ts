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
  const verticalSpacing = 180;

  /*
   * ----------------------------------------------------
   * 1. Build incoming-edge count
   * ----------------------------------------------------
   *
   * incomingCount[node] tells us how many dependencies
   * point INTO this node.
   *
   * Nodes with 0 incoming edges are our graph roots.
   */
  const incomingCount = new Map<string, number>();

  for (const node of viewModel.nodes) {
    incomingCount.set(node.id, 0);
  }

  for (const edge of viewModel.edges) {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
  }

  /*
   * ----------------------------------------------------
   * 2. Build adjacency list
   * ----------------------------------------------------
   *
   * source -> targets
   *
   * Example:
   *
   * index.ts -> utils.ts
   * index.ts -> db.ts
   */
  const adjacency = new Map<string, string[]>();

  for (const node of viewModel.nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of viewModel.edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  /*
   * ----------------------------------------------------
   * 3. Assign graph levels
   * ----------------------------------------------------
   *
   * Root:
   *     level 0
   *
   * Dependency:
   *     level 1
   *
   * Dependency of dependency:
   *     level 2
   */
  const levels = new Map<string, number>();

  const queue: string[] = [];

  for (const node of viewModel.nodes) {
    if ((incomingCount.get(node.id) ?? 0) === 0) {
      levels.set(node.id, 0);
      queue.push(node.id);
    }
  }

  /*
   * Process the graph level by level.
   */
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentLevel = levels.get(current) ?? 0;

    const children = adjacency.get(current) ?? [];

    for (const child of children) {
      const nextLevel = currentLevel + 1;

      const existingLevel = levels.get(child);

      if (existingLevel === undefined || nextLevel > existingLevel) {
        levels.set(child, nextLevel);
      }

      /*
       * Only process when all incoming edges have been
       * accounted for.
       */
      const remainingIncoming = (incomingCount.get(child) ?? 0) - 1;

      incomingCount.set(child, remainingIncoming);

      if (remainingIncoming === 0) {
        queue.push(child);
      }
    }
  }

  /*
   * ----------------------------------------------------
   * 4. Handle disconnected nodes / cycles
   * ----------------------------------------------------
   *
   * A cyclic graph may not have a root.
   * Any node that still has no level gets placed at
   * level 0 so it still appears in the graph.
   */
  for (const node of viewModel.nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  }

  /*
   * ----------------------------------------------------
   * 5. Group nodes by level
   * ----------------------------------------------------
   */
  const nodesByLevel = new Map<number, GraphViewNode[]>();

  for (const node of viewModel.nodes) {
    const level = levels.get(node.id) ?? 0;

    if (!nodesByLevel.has(level)) {
      nodesByLevel.set(level, []);
    }

    nodesByLevel.get(level)!.push(node);
  }

  /*
   * ----------------------------------------------------
   * 6. Create React Flow nodes
   * ----------------------------------------------------
   *
   * Nodes on the same level are placed horizontally.
   *
   * Example:
   *
   *              index
   *
   *       utils    db    config
   */
  const nodes: Node[] = [];

  const sortedLevels = [...nodesByLevel.keys()].sort((a, b) => a - b);

  for (const level of sortedLevels) {
    const levelNodes = nodesByLevel.get(level)!;

    const totalWidth = (levelNodes.length - 1) * horizontalSpacing;

    const startX = -totalWidth / 2;

    levelNodes.forEach((node, index) => {
      nodes.push({
        id: node.id,

        position: {
          x: startX + index * horizontalSpacing,
          y: level * verticalSpacing,
        },

        data: {
          label: node.label,
        },
      });
    });
  }

  /*
   * ----------------------------------------------------
   * 7. Convert graph edges
   * ----------------------------------------------------
   */
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
