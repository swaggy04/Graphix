import { cloneRepository } from "./repository.service";

async function main() {
  const repositoryPath = await cloneRepository(
    "https://github.com/facebook/react"
  );

  console.log("Repository cloned to:");
  console.log(repositoryPath);
}

main().catch(console.error);