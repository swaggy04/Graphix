import ELK from "elkjs/lib/elk.bundled.js";
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

// ==================================================
// ELK INSTANCE
// ==================================================

const elk = new ELK();

// ==================================================
// NODE SIZE
// Must match FileNode.tsx
// ==================================================

const NODE_WIDTH = 240;
const NODE_HEIGHT = 52;

// ==================================================
// ELK SPACING
// ==================================================

const NODE_SPACING = 50;
const LAYER_SPACING = 90;

// ==================================================
// COMPONENT SPACING
// ==================================================

const COMPONENT_GAP_X = 140;
const COMPONENT_GAP_Y = 160;

const COMPONENT_PADDING = 50;

// ==================================================
// GRAPH PACKING
// ==================================================

const MAX_GRAPH_WIDTH = 2200;

// ==================================================
// MAIN
// ==================================================

export async function createELKGraph(viewModel: GraphViewModel): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  if (viewModel.nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
    };
  }

  // ------------------------------------------------
  // 1. Find weakly connected components
  // ------------------------------------------------

  const components = findConnectedComponents(viewModel.nodes, viewModel.edges);

  // ------------------------------------------------
  // 2. Layout every component independently
  // ------------------------------------------------

  const layouts = await Promise.all(
    components.map(async (component) => {
      const ids = new Set(component);

      const componentNodes = viewModel.nodes.filter((node) => ids.has(node.id));

      const componentEdges = viewModel.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));

      return layoutComponent(componentNodes, componentEdges);
    }),
  );

  // ------------------------------------------------
  // 3. Largest components first
  // ------------------------------------------------

  layouts.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;

    return areaB - areaA;
  });

  // ------------------------------------------------
  // 4. Pack components
  // ------------------------------------------------

  const positionedNodes = packComponents(layouts);

  // ------------------------------------------------
  // 5. Create React Flow edges
  // ------------------------------------------------

  const edges: Edge[] = viewModel.edges.map((edge) => ({
    id: edge.id,

    source: edge.source,

    target: edge.target,

    type: "smoothstep",

    animated: false,

    style: {
      stroke: "#52525b",
      strokeWidth: 1.5,
      opacity: 0.7,
    },
  }));

  return {
    nodes: positionedNodes,

    edges,
  };
}

// ==================================================
// LAYOUT ONE CONNECTED COMPONENT
// ==================================================

async function layoutComponent(
  componentNodes: GraphViewNode[],
  componentEdges: GraphViewEdge[],
): Promise<{
  nodes: Node[];
  width: number;
  height: number;
}> {
  // ------------------------------------------------
  // Isolated node
  // ------------------------------------------------

  if (componentNodes.length === 1) {
    const node = componentNodes[0];

    return {
      nodes: [
        {
          id: node.id,

          type: "file",

          position: {
            x: COMPONENT_PADDING,

            y: COMPONENT_PADDING,
          },

          data: {
            label: node.label,

            isolated: true,
          },

          draggable: true,
        },
      ],

      width: NODE_WIDTH + COMPONENT_PADDING * 2,

      height: NODE_HEIGHT + COMPONENT_PADDING * 2,
    };
  }

  // ------------------------------------------------
  // Build ELK graph
  // ------------------------------------------------

  const graph = {
    id: `component-${componentNodes[0].id}`,

    layoutOptions: {
      // Layered layout is ideal for dependency graphs.
      "elk.algorithm": "layered",

      // Dependency direction:
      //
      // A
      // ↓
      // B
      // ↓
      // C
      //
      "elk.direction": "DOWN",

      // Horizontal spacing between nodes.
      "elk.spacing.nodeNode": String(NODE_SPACING),

      // Vertical spacing between layers.
      "elk.layered.spacing.nodeNodeBetweenLayers": String(LAYER_SPACING),

      // Reduce edge crossings.
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",

      // Better node placement.
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",

      // Space between internal components.
      "elk.spacing.componentComponent": "80",

      // Use orthogonal dependency paths.
      "elk.edgeRouting": "ORTHOGONAL",

      // Padding around component.
      "elk.padding": `[top=${COMPONENT_PADDING},left=${COMPONENT_PADDING},bottom=${COMPONENT_PADDING},right=${COMPONENT_PADDING}]`,
    },

    // ------------------------------------------------
    // ELK nodes
    // ------------------------------------------------

    children: componentNodes.map((node) => ({
      id: node.id,

      width: NODE_WIDTH,

      height: NODE_HEIGHT,
    })),

    // ------------------------------------------------
    // ELK edges
    // ------------------------------------------------

    edges: componentEdges.map((edge) => ({
      id: edge.id,

      sources: [edge.source],

      targets: [edge.target],
    })),
  };

  // ------------------------------------------------
  // Run ELK
  // ------------------------------------------------

  const result = await elk.layout(graph);

  // ------------------------------------------------
  // Convert ELK nodes -> React Flow nodes
  // ------------------------------------------------

  const nodes: Node[] = (result.children ?? []).map((elkNode) => {
    const original = componentNodes.find((node) => node.id === elkNode.id);

    return {
      id: elkNode.id,

      type: "file",

      position: {
        x: elkNode.x ?? COMPONENT_PADDING,

        y: elkNode.y ?? COMPONENT_PADDING,
      },

      data: {
        label: original?.label ?? elkNode.id,

        isolated: false,
      },

      draggable: true,
    };
  });

  // ------------------------------------------------
  // Calculate actual component bounds
  //
  // Do not depend on result.width/result.height.
  // We calculate the bounds from the actual
  // React Flow node positions instead.
  // ------------------------------------------------

  let maxX = 0;
  let maxY = 0;

  for (const node of nodes) {
    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);

    maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
  }

  const width = maxX + COMPONENT_PADDING;

  const height = maxY + COMPONENT_PADDING;

  return {
    nodes,

    width,

    height,
  };
}

// ==================================================
// PACK COMPONENTS
// ==================================================

function packComponents(
  layouts: {
    nodes: Node[];
    width: number;
    height: number;
  }[],
): Node[] {
  if (layouts.length === 0) {
    return [];
  }

  const result: Node[] = [];

  let cursorX = 0;

  let cursorY = 0;

  let rowHeight = 0;

  for (const layout of layouts) {
    // ------------------------------------------------
    // Start a new row if component doesn't fit.
    // ------------------------------------------------

    if (cursorX > 0 && cursorX + layout.width > MAX_GRAPH_WIDTH) {
      cursorX = 0;

      cursorY += rowHeight + COMPONENT_GAP_Y;

      rowHeight = 0;
    }

    // ------------------------------------------------
    // Place component nodes.
    // ------------------------------------------------

    for (const node of layout.nodes) {
      result.push({
        ...node,

        position: {
          x: node.position.x + cursorX,

          y: node.position.y + cursorY,
        },
      });
    }

    // ------------------------------------------------
    // Move packing cursor.
    // ------------------------------------------------

    cursorX += layout.width + COMPONENT_GAP_X;

    rowHeight = Math.max(rowHeight, layout.height);
  }

  return result;
}

// ==================================================
// FIND WEAKLY CONNECTED COMPONENTS
// ==================================================

function findConnectedComponents(nodes: GraphViewNode[], edges: GraphViewEdge[]): string[][] {
  const adjacency = new Map<string, Set<string>>();

  // ------------------------------------------------
  // Initialize adjacency map.
  // ------------------------------------------------

  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }

  // ------------------------------------------------
  // Treat dependency graph as UNDIRECTED
  // for component detection.
  //
  // A -> B
  //
  // means A and B belong to the same
  // connected component.
  // ------------------------------------------------

  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);

    adjacency.get(edge.target)?.add(edge.source);
  }

  // ------------------------------------------------
  // DFS
  // ------------------------------------------------

  const visited = new Set<string>();

  const components: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) {
      continue;
    }

    const component: string[] = [];

    const stack: string[] = [node.id];

    visited.add(node.id);

    while (stack.length > 0) {
      const current = stack.pop();

      if (!current) {
        continue;
      }

      component.push(current);

      const neighbours = adjacency.get(current) ?? new Set<string>();

      for (const neighbour of neighbours) {
        if (visited.has(neighbour)) {
          continue;
        }

        visited.add(neighbour);

        stack.push(neighbour);
      }
    }

    components.push(component);
  }

  return components;
}
