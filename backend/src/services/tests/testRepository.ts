import { cloneRepository } from "../repository.service";

async function main() {
  const repositoryPath = await cloneRepository(
    "https://github.com/swaggy04/Forge"
  );

  console.log("Repository cloned to:");
  console.log(repositoryPath);
}

main().catch((error) => {
  console.error("Clone failed:", error);
});