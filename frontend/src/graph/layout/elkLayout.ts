import ELK from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";

// ==================================================
// GRAPH TYPES
// ==================================================

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
// ELK
// ==================================================

const elk = new ELK();

// ==================================================
// NODE SIZE
// Must match FileNode.tsx
// ==================================================

const NODE_WIDTH = 240;
const NODE_HEIGHT = 52;

// ==================================================
// CONNECTED GRAPH SPACING
// ==================================================

const NODE_SPACING = 50;
const LAYER_SPACING = 90;

const COMPONENT_PADDING = 50;

const COMPONENT_GAP_X = 140;
const COMPONENT_GAP_Y = 160;

const MAX_GRAPH_WIDTH = 2200;

// ==================================================
// ISOLATED FILE SPACING
// ==================================================

const ISOLATED_GAP_X = 40;
const ISOLATED_GAP_Y = 28;

const ISOLATED_FOLDER_GAP = 90;

const ISOLATED_MAX_WIDTH = 1900;

// ==================================================
// TYPES
// ==================================================

interface LayoutBlock {
  nodes: Node[];
  width: number;
  height: number;
}

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
  // 2. Separate connected components and isolated
  // files.
  //
  // Isolated files are NOT passed through ELK.
  //
  // This is intentional.
  //
  // ELK is useful for dependency relationships.
  // A file with no relationships does not need
  // hierarchical layout.
  // ------------------------------------------------

  const connectedComponents = components.filter((component) => component.length > 1);

  const isolatedComponents = components.filter((component) => component.length === 1);

  // ------------------------------------------------
  // 3. Layout connected components independently
  // ------------------------------------------------

  const connectedLayouts = await Promise.all(
    connectedComponents.map((component) => {
      const ids = new Set(component);

      const componentNodes = viewModel.nodes.filter((node) => ids.has(node.id));

      const componentEdges = viewModel.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));

      return layoutConnectedComponent(componentNodes, componentEdges);
    }),
  );

  // ------------------------------------------------
  // 4. Largest components first
  // ------------------------------------------------

  connectedLayouts.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;

    return areaB - areaA;
  });

  // ------------------------------------------------
  // 5. Pack connected components
  // ------------------------------------------------

  const connectedNodes = packConnectedComponents(connectedLayouts);

  // ------------------------------------------------
  // 6. Calculate connected graph bounds
  // ------------------------------------------------

  const connectedBounds = getBounds(connectedNodes);

  // ------------------------------------------------
  // 7. Layout isolated files separately
  //
  // They are grouped by folder and placed in
  // predictable grids.
  // ------------------------------------------------

  const isolatedNodes = layoutIsolatedFiles(isolatedComponents, viewModel.nodes);

  // ------------------------------------------------
  // 8. Place isolated region BELOW the connected
  // dependency graph.
  // ------------------------------------------------

  const isolatedStartY = connectedNodes.length > 0 ? connectedBounds.maxY + 180 : 0;

  const positionedIsolatedNodes = isolatedNodes.map((node) => ({
    ...node,

    position: {
      x: node.position.x,

      y: node.position.y + isolatedStartY,
    },
  }));

  // ------------------------------------------------
  // 9. Combine
  // ------------------------------------------------

  const nodes = [...connectedNodes, ...positionedIsolatedNodes];

  // ------------------------------------------------
  // 10. React Flow edges
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
    nodes,
    edges,
  };
}

// ==================================================
// CONNECTED COMPONENT
// ==================================================

async function layoutConnectedComponent(componentNodes: GraphViewNode[], componentEdges: GraphViewEdge[]): Promise<LayoutBlock> {
  // ------------------------------------------------
  // Build ELK graph
  // ------------------------------------------------

  const graph = {
    id: `component-${componentNodes[0]?.id ?? "unknown"}`,

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

      // Nodes on the same layer.
      "elk.spacing.nodeNode": String(NODE_SPACING),

      // Distance between dependency layers.
      "elk.layered.spacing.nodeNodeBetweenLayers": String(LAYER_SPACING),

      // Reduce crossings.
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",

      // Balanced node placement.
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",

      // Balanced BK alignment.
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",

      // Cycle handling.
      "elk.layered.cycleBreaking.strategy": "GREEDY",

      // Padding around the component.
      "elk.padding": `[top=${COMPONENT_PADDING},left=${COMPONENT_PADDING},bottom=${COMPONENT_PADDING},right=${COMPONENT_PADDING}]`,
    },

    children: componentNodes.map((node) => ({
      id: node.id,

      width: NODE_WIDTH,

      height: NODE_HEIGHT,
    })),

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

        componentKind: "connected",
      },

      draggable: true,
    };
  });

  // ------------------------------------------------
  // Normalize
  //
  // ELK already gives useful coordinates, but
  // normalization makes every component start from
  // a predictable origin.
  // ------------------------------------------------

  normalizeNodes(nodes);

  // ------------------------------------------------
  // Calculate actual bounds
  //
  // Do NOT use result.width/result.height.
  // ELK's TypeScript result type does not guarantee
  // those properties.
  // ------------------------------------------------

  const bounds = getBounds(nodes);

  return {
    nodes,

    width: bounds.maxX - bounds.minX + COMPONENT_PADDING,

    height: bounds.maxY - bounds.minY + COMPONENT_PADDING,
  };
}

// ==================================================
// PACK CONNECTED COMPONENTS
// ==================================================

function packConnectedComponents(layouts: LayoutBlock[]): Node[] {
  if (layouts.length === 0) {
    return [];
  }

  const result: Node[] = [];

  let cursorX = 0;

  let cursorY = 0;

  let rowHeight = 0;

  for (const layout of layouts) {
    // ------------------------------------------------
    // Start another row if necessary.
    // ------------------------------------------------

    if (cursorX > 0 && cursorX + layout.width > MAX_GRAPH_WIDTH) {
      cursorX = 0;

      cursorY += rowHeight + COMPONENT_GAP_Y;

      rowHeight = 0;
    }

    // ------------------------------------------------
    // Place nodes
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
    // Move cursor
    // ------------------------------------------------

    cursorX += layout.width + COMPONENT_GAP_X;

    rowHeight = Math.max(rowHeight, layout.height);
  }

  return result;
}

// ==================================================
// ISOLATED FILES
// ==================================================

function layoutIsolatedFiles(isolatedComponents: string[][], allNodes: GraphViewNode[]): Node[] {
  if (isolatedComponents.length === 0) {
    return [];
  }

  // ------------------------------------------------
  // Get isolated IDs
  // ------------------------------------------------

  const isolatedIds = new Set(isolatedComponents.flatMap((component) => component));

  const isolatedFiles = allNodes.filter((node) => isolatedIds.has(node.id));

  // ------------------------------------------------
  // Group isolated files by folder
  // ------------------------------------------------

  const folders = new Map<string, GraphViewNode[]>();

  for (const file of isolatedFiles) {
    const folder = getFolder(file.id);

    const existing = folders.get(folder);

    if (existing) {
      existing.push(file);
    } else {
      folders.set(folder, [file]);
    }
  }

  // ------------------------------------------------
  // Stable folder ordering
  // ------------------------------------------------

  const sortedFolders = [...folders.entries()].sort(([a], [b]) => a.localeCompare(b));

  const result: Node[] = [];

  let folderY = 0;

  // ------------------------------------------------
  // Layout each folder
  // ------------------------------------------------

  for (const [folder, files] of sortedFolders) {
    const layout = layoutIsolatedFolder(folder, files);

    for (const node of layout.nodes) {
      result.push({
        ...node,

        position: {
          x: node.position.x,

          y: node.position.y + folderY,
        },
      });
    }

    folderY += layout.height + ISOLATED_FOLDER_GAP;
  }

  return result;
}

// ==================================================
// ISOLATED FOLDER
// ==================================================

function layoutIsolatedFolder(folder: string, files: GraphViewNode[]): LayoutBlock {
  const sortedFiles = [...files].sort((a, b) => a.label.localeCompare(b.label));

  // ------------------------------------------------
  // Adaptive number of columns
  // ------------------------------------------------

  const maxColumns = Math.max(1, Math.floor(ISOLATED_MAX_WIDTH / (NODE_WIDTH + ISOLATED_GAP_X)));

  const columns = Math.min(maxColumns, getIsolatedColumnCount(sortedFiles.length));

  const rows = Math.ceil(sortedFiles.length / columns);

  const width = columns * NODE_WIDTH + (columns - 1) * ISOLATED_GAP_X;

  const height = rows * NODE_HEIGHT + (rows - 1) * ISOLATED_GAP_Y;

  const nodes: Node[] = sortedFiles.map((file, index) => {
    const column = index % columns;

    const row = Math.floor(index / columns);

    return {
      id: file.id,

      type: "file",

      position: {
        x: column * (NODE_WIDTH + ISOLATED_GAP_X),

        y: row * (NODE_HEIGHT + ISOLATED_GAP_Y),
      },

      data: {
        label: file.label,

        isolated: true,

        componentKind: "isolated",

        folder,
      },

      draggable: true,
    };
  });

  return {
    nodes,

    width,

    height,
  };
}

// ==================================================
// ISOLATED COLUMN COUNT
// ==================================================

function getIsolatedColumnCount(count: number): number {
  if (count <= 2) {
    return count;
  }

  if (count <= 6) {
    return 3;
  }

  if (count <= 12) {
    return 4;
  }

  if (count <= 30) {
    return 6;
  }

  if (count <= 60) {
    return 8;
  }

  return 10;
}

// ==================================================
// FOLDER
// ==================================================

function getFolder(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");

  const parts = normalized.split("/");

  if (parts.length <= 1) {
    return "root";
  }

  return parts.slice(0, -1).join("/");
}

// ==================================================
// NORMALIZE
// ==================================================

function normalizeNodes(nodes: Node[]) {
  if (nodes.length === 0) {
    return;
  }

  let minX = Infinity;

  let minY = Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);

    minY = Math.min(minY, node.position.y);
  }

  for (const node of nodes) {
    node.position = {
      x: node.position.x - minX + COMPONENT_PADDING,

      y: node.position.y - minY + COMPONENT_PADDING,
    };
  }
}

// ==================================================
// BOUNDS
// ==================================================

function getBounds(nodes: Node[]) {
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  let minX = Infinity;

  let minY = Infinity;

  let maxX = -Infinity;

  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);

    minY = Math.min(minY, node.position.y);

    maxX = Math.max(maxX, node.position.x + NODE_WIDTH);

    maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
  }

  return {
    minX,

    minY,

    maxX,

    maxY,
  };
}

// ==================================================
// WEAKLY CONNECTED COMPONENTS
// ==================================================

function findConnectedComponents(nodes: GraphViewNode[], edges: GraphViewEdge[]): string[][] {
  const adjacency = new Map<string, Set<string>>();

  // ------------------------------------------------
  // Initialize
  // ------------------------------------------------

  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }

  // ------------------------------------------------
  // Treat dependency graph as undirected
  // for component detection.
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
