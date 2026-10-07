import { cloneRepository } from "../repository.service";
import { discoverSourceFiles } from "../file-discovery.service";
import { createDependencyGraph } from "../dependency-analyzer.service";

const repositories = ["https://github.com/withastro/astro"];
async function analyzeRepository(url: string) {
  console.log("\n========================================");
  console.log(`Repository: ${url}`);
  console.log("========================================");

  const cloneStart = performance.now();

  const repositoryPath = await cloneRepository(url);
  console.log("Repository path:", repositoryPath);

  const cloneTime = performance.now() - cloneStart;

  const discoveryStart = performance.now();

  const files = await discoverSourceFiles(repositoryPath);

  const discoveryTime = performance.now() - discoveryStart;

  const analysisStart = performance.now();

  const analysis = await createDependencyGraph(repositoryPath, files);

  const analysisTime = performance.now() - analysisStart;

  console.log("\nFiles:", analysis.stats.totalFiles);
  console.log("Parsed:", analysis.stats.parsedFiles);
  console.log("Failed:", analysis.stats.failedFiles);

  console.log("Resolved imports:", analysis.stats.resolvedImports);

  console.log("Unresolved imports:", analysis.stats.unresolvedImports);

  console.log("Relative imports:", analysis.stats.relativeImports);

  console.log("Package imports:", analysis.stats.packageImports);

  console.log("Builtin imports:", analysis.stats.builtinImports);

  console.log("\nFirst unresolved import specifiers:");

  console.log(analysis.stats.unresolvedImportSpecifiers.slice(0, 50));

  console.log("\nUnresolved relative imports:");

  console.log(analysis.stats.unresolvedRelativeImportSpecifiers);

  console.log("\nGraph nodes:", analysis.graph.order);

  console.log("Graph edges:", analysis.graph.size);

  console.log("\nClone time:", `${Math.round(cloneTime)} ms`);

  console.log("Discovery time:", `${Math.round(discoveryTime)} ms`);

  console.log("Analysis time:", `${Math.round(analysisTime)} ms`);
}

async function main() {
  for (const repository of repositories) {
    try {
      await analyzeRepository(repository);
    } catch (error) {
      console.error(`Failed to analyze ${repository}`, error);
    }
  }
}

main().catch((error) => {
  console.error("Real repository test failed:", error);
});
