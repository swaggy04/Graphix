import { cloneRepository } from "../repository.service";
import { discoverSourceFiles } from "../file-discovery.service";

async function main() {
  const repositoryPath = await cloneRepository("https://github.com/facebook/react");

  console.log("Repository:");
  console.log(repositoryPath);

  const files = await discoverSourceFiles(repositoryPath);

  console.log(`\nFound ${files.length} source files`);

  console.log("\nFirst 20 files:");

  console.log(files.slice(0, 20));
}

main().catch((error) => {
  console.error("File discovery failed:", error);
});
