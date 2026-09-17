import { cloneRepository } from "../repository.service";
import { analyzeRepo } from "../code-analysis.service";

async function main() {
  const repositoryPath = await cloneRepository("https://github.com/facebook/react");

  console.log("Repository:");
  console.log(repositoryPath);

  const results = await analyzeRepo(repositoryPath);

  const successful = results.filter((file) => !file.error);

  const failed = results.filter((file) => file.error);

  console.log(`\nTotal files: ${results.length}`);
  console.log(`Successfully analyzed: ${successful.length}`);
  console.log(`Failed to analyze: ${failed.length}`);

  console.log("\nFirst successful files:");

  console.log(successful.slice(0, 5));

  console.log("\nFirst failed files:");

  console.log(failed.slice(0, 5));
}

main().catch((error) => {
  console.error("Code analysis failed:", error);
});
