import path from "path";
import { discoverSourceFiles } from "../file-discovery.service";
import { createDependencyGraph } from "../dependency-analyzer.service";

async function main() {
  const repositoryPath =
    "C:/Users/litan/AppData/Local/Temp/traceon-QdzZgA/react";

  const startTime = Date.now();

  console.log("Repository:", repositoryPath);

  const files = await discoverSourceFiles(repositoryPath);

  console.log("Total files:", files.length);

  const result = await createDependencyGraph(
    repositoryPath,
    files
  );

  const duration = Date.now() - startTime;

  console.log("Graph nodes:", result.graph.order);
  console.log("Graph edges:", result.graph.size);
  console.log("Analysis time:", `${duration} ms`);

  console.log("\nSample edges:");

  for (const edge of result.graph.edges().slice(0, 10)) {
    console.log(
      `${result.graph.source(edge)} → ${result.graph.target(edge)}`
    );
  }
}

main().catch((error) => {
  console.error(error);
});