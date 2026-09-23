import type { Edge, Node } from "@xyflow/react";
import { createELKGraph } from "../graph/layout/elkLayout";


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

export async function createReactFlowGraph(viewModel: GraphViewModel): Promise<{
  nodes: Node[];
  edges: Edge[];
}> {
  return createELKGraph(viewModel);
}
