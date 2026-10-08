import Graph from "graphology";
import { storeAnalysis, getAnalysis } from "../analysis-store.service";

async function main() {
  const graph = new Graph();

  graph.addNode("test-file.ts");

  const analysisId = storeAnalysis(graph);

  console.log("Immediately after storing:", getAnalysis(analysisId) ? "EXISTS" : "MISSING");

  await new Promise((resolve) => {
    setTimeout(resolve, 1500);
  });

  console.log("After TTL:", getAnalysis(analysisId) ? "EXISTS" : "MISSING");
}

main().catch(console.error);
