import Graph from "graphology";
import { analyzeFile } from "../file-analysis.service";

async function main() {
  const graph = new Graph({
    type: "directed",
  });

  graph.addNode("entry.ts");
  graph.addNode("db.ts");
  graph.addNode("utils.ts");
  graph.addNode("helper.ts");

  graph.addEdge("entry.ts", "db.ts");
  graph.addEdge("entry.ts", "utils.ts");
  graph.addEdge("utils.ts", "helper.ts");

  const result = analyzeFile(graph, "helper.ts");

  console.log("File Analysis:");
  console.dir(result, { depth: null });
}

main().catch((error) => {
  console.error("File analysis test failed:", error);
});
