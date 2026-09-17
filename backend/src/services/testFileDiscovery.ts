import { cloneRepository } from "./repository.service";
import { discoverSourceFiles } from "./file-discovery.service";

async function main() {
  const repositoryPath = await cloneRepository(
    "https://github.com/facebook/react"
  );

  const files = await discoverSourceFiles(repositoryPath);

  console.log(`Found ${files.length} source files`);

  for (const file of files.slice(0, 10)) {
    console.log(file);
  }
}

main().catch(console.error);