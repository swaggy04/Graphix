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

const elk = new ELK();

// ==================================================
// NODE SIZE
// Must match FileNode
// ==================================================

const NODE_WIDTH = 240;
const NODE_HEIGHT = 52;

// ==================================================
// ELK CONFIGURATION
// ==================================================

const NODE_NODE_SPACING = 50;
const NODE_LAYER_SPACING = 100;

const COMPONENT_SPACING = 140;

// ==================================================
// CREATE REACT FLOW GRAPH
// ==================================================

export async function createReactFlowGraph(viewModel: GraphViewModel): Promise<{
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
  // Build ELK graph
  // ------------------------------------------------

  const graph = {
    id: "grapix-root",

    layoutOptions: {
      // Hierarchical / layered dependency graph
      "elk.algorithm": "layered",

      // Top -> Bottom
      "elk.direction": "DOWN",

      // Spacing between nodes in the same layer
      "elk.spacing.nodeNode": String(NODE_NODE_SPACING),

      // Spacing between layers
      "elk.layered.spacing.nodeNodeBetweenLayers": String(NODE_LAYER_SPACING),

      // Keep disconnected components separated
      "elk.spacing.componentComponent": String(COMPONENT_SPACING),

      // Better handling of cyclic dependencies
      "elk.layered.feedbackEdges": "true",

      // Try to minimize crossings
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",

      // More balanced placement
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",

      // Favor compact graph
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",

      // Don't allow unnecessary edge routing
      "elk.edgeRouting": "ORTHOGONAL",

      // Components should be handled independently
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",

      // Keep graph compact
      "elk.layered.compaction.postCompaction": "EDGE_LENGTH",
    },

    children: viewModel.nodes.map((node) => ({
      id: node.id,

      width: NODE_WIDTH,
      height: NODE_HEIGHT,

      labels: [
        {
          text: node.label,
        },
      ],
    })),

    edges: viewModel.edges.map((edge) => ({
      id: edge.id,

      sources: [edge.source],

      targets: [edge.target],
    })),
  };

  // ------------------------------------------------
  // Run ELK
  // ------------------------------------------------

  const layout = await elk.layout(graph);

  // ------------------------------------------------
  // Convert ELK nodes -> React Flow nodes
  // ------------------------------------------------

  const nodes: Node[] = (layout.children ?? []).map((node) => ({
    id: node.id,

    type: "file",

    position: {
      x: node.x ?? 0,
      y: node.y ?? 0,
    },

    data: {
      label: viewModel.nodes.find((item) => item.id === node.id)?.label ?? "Unknown file",
    },

    draggable: true,
  }));

  // ------------------------------------------------
  // Convert edges
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
