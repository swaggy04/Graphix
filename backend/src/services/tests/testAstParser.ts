import { cloneRepository } from "../repository.service";
import { discoverSourceFiles } from "../file-discovery.service";
import { extractImports } from "../ast-parser.service";

async function main() {
  const repositoryPath = await cloneRepository("https://github.com/facebook/react");

  console.log("Repository:");
  console.log(repositoryPath);

  const files = await discoverSourceFiles(repositoryPath);

  console.log(`\nFound ${files.length} source files`);

const candidateFiles = files.filter(
  (file) =>
    file.endsWith(".ts") ||
    file.endsWith(".tsx") ||
    file.endsWith(".js") ||
    file.endsWith(".jsx")
);

const firstFile = candidateFiles[10];

if (!firstFile) {
  throw new Error("No suitable source file found");
}
  console.log("\nAnalyzing:");
  console.log(firstFile);

  const imports = await extractImports(repositoryPath, firstFile);

  console.log("\nImports:");
  console.log(imports);
}

main().catch((error) => {
  console.error(error);
});
