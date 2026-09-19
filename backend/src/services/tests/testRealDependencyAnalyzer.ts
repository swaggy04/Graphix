import { discoverSourceFiles } from "../file-discovery.service";
import { createDependencyGraph } from "../dependency-analyzer.service";

async function main() {
  const repositoryPath =
    "C:/Users/litan/AppData/Local/Temp/traceon-nXIXSj/Forge";

  const startTime = Date.now();

  console.log("Repository:", repositoryPath);

  const files = await discoverSourceFiles(repositoryPath);

  console.log("Total files:", files.length);

  const result = await createDependencyGraph(repositoryPath, files);

  const duration = Date.now() - startTime;

  console.log("Graph nodes:", result.graph.order);
  console.log("Graph edges:", result.graph.size);

  console.log("\nAnalysis stats:");
  console.log("Parsed files:", result.stats.parsedFiles);
  console.log("Failed files:", result.stats.failedFiles);

  console.log("\nImports:");
  console.log("Relative imports:", result.stats.relativeImports);
  console.log("Package imports:", result.stats.packageImports);
  console.log("Builtin imports:", result.stats.builtinImports);

  console.log("\nResolution:");
  console.log("Resolved imports:", result.stats.resolvedImports);
  console.log("Unresolved imports:", result.stats.unresolvedImports);

  console.log("\nUnresolved import specifiers:");

  for (const specifier of result.stats.unresolvedImportSpecifiers) {
    console.log(specifier);
  }

  console.log("\nAnalysis time:", `${duration} ms`);

  console.log("\nSample edges:");

  for (const edge of result.graph.edges().slice(0, 10)) {
    console.log(`${result.graph.source(edge)} → ${result.graph.target(edge)}`);
  }
}

main().catch((error) => {
  console.error(error);
});
