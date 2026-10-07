import path from "path";
import { discoverSourceFiles } from "../file-discovery.service";
import { createDependencyGraph } from "../dependency-analyzer.service";

async function main() {
  const repositoryPath = path.resolve(process.cwd(), "src/services/tests/parser-fixture");

  const files = await discoverSourceFiles(repositoryPath);

  const analysis = await createDependencyGraph(repositoryPath, files);

  console.log("\nFiles:");
  console.log(files);

  console.log("\nStats:");
  console.log(analysis.stats);

  console.log("\nNodes:");
  console.log(analysis.graph.nodes());

  console.log("\nEdges:");

  for (const edge of analysis.graph.edges()) {
    console.log({
      source: analysis.graph.source(edge),
      target: analysis.graph.target(edge),
    });
  }
}

main().catch((error) => {
  console.error("Dependency analyzer syntax test failed:", error);
});
