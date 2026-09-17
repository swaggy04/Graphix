import { cloneRepository } from "../repository.service";
import { analyzeRepo } from "../code-analysis.service";

async function main() {
  const repositoryPath = await cloneRepository(
    "https://github.com/facebook/react"
  );

  console.log("Repository:", repositoryPath);

  const parsedFiles = await analyzeRepo(repositoryPath);

  console.log(`Analyzed ${parsedFiles.length} files`);

  console.log("\nFirst 5 results:");

  console.log(parsedFiles.slice(0, 5));
}

main().catch((error) => {
  console.error(error);
});