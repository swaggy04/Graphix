import path from "path";
import { createDependencyGraph } from "../dependency-analyzer.service";

async function main() {
  const repositoryPath = path.resolve(
    "src/services/tests/resolver-fixture"
  );
  const result = await createDependencyGraph(repositoryPath, [
    "entry.ts",
    "utils.ts",
    "db.ts",
  ]);

  console.log("Nodes:", result.graph.order);
  console.log("Edges:", result.graph.size);

  console.log("Nodes list:");
  console.log(result.graph.nodes());
  console.log("Edges:");
  
  for (const edge of result.graph.edges()) {
    console.log(
      `${result.graph.source(edge)} → ${result.graph.target(edge)}`
    );
  }

  console.log("Edges list:");
  console.log(result.graph.edges());
}

main().catch((error) => {
  console.error(error);
});
// C:\Users\litan\AppData\Local\Temp\traceon-QdzZgA\react