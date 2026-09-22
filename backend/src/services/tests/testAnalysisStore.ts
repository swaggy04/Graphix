import Graph from "graphology";
import {
  storeAnalysis,
  getAnalysis,
  deleteAnalysis,
} from "../analysis-store.service";

async function main() {
  const graph = new Graph({
    type: "directed",
  });

  graph.addNode("entry.ts");
  graph.addNode("utils.ts");

  graph.addEdge("entry.ts", "utils.ts");

  const analysisId = storeAnalysis(graph);

  console.log("Analysis ID:", analysisId);

  const storedGraph = getAnalysis(analysisId);

  console.log("Graph found:", storedGraph !== undefined);

  if (storedGraph) {
    console.log("Nodes:", storedGraph.nodes());
    console.log("Edges:", storedGraph.edges());
  }

  const deleted = deleteAnalysis(analysisId);

  console.log("Deleted:", deleted);

  const deletedGraph = getAnalysis(analysisId);

  console.log("Graph after deletion:", deletedGraph);
}

main().catch((error) => {
  console.error("Analysis store test failed:", error);
});
