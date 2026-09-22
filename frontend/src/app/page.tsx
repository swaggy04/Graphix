import GraphCanvas from "../components/GraphCanvas";
import {
  createReactFlowGraph,
  type GraphViewModel,
} from "../lib/graph-adapter";

const graphViewModel: GraphViewModel = {
  nodes: [
    {
      id: "entry.ts",
      label: "entry.ts",
    },
    {
      id: "utils.ts",
      label: "utils.ts",
    },
    {
      id: "db.ts",
      label: "db.ts",
    },
    {
      id: "helper.ts",
      label: "helper.ts",
    },
  ],

  edges: [
    {
      id: "entry-utils",
      source: "entry.ts",
      target: "utils.ts",
    },
    {
      id: "entry-db",
      source: "entry.ts",
      target: "db.ts",
    },
    {
      id: "utils-helper",
      source: "utils.ts",
      target: "helper.ts",
    },
  ],
};

const { nodes, edges } = createReactFlowGraph(graphViewModel);

export default function Home() {
  return <GraphCanvas nodes={nodes} edges={edges} />;
}
