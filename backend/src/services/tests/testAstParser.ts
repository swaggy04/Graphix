import { cloneRepository } from "../repository.service";
import { discoverSourceFiles } from "../file-discovery.service";
import { extractImports } from "../ast-parser.service";

async function main() {
  const repositoryPath = await cloneRepository("https://github.com/facebook/react");

  const files = await discoverSourceFiles(repositoryPath);

  const extensions = [".js", ".jsx", ".ts", ".tsx"];

  for (const extension of extensions) {
    const candidateFile = files.find((file) => file.endsWith(extension) && !file.includes("fixtures"));

    if (!candidateFile) {
      console.log(`No ${extension} file found`);
      continue;
    }

    console.log(`\nAnalyzing ${extension}:`);
    console.log(candidateFile);

    try {
      const imports = await extractImports(repositoryPath, candidateFile);

      console.log("Imports:");
      console.log(imports);
    } catch (error) {
      console.error(`Failed to parse ${candidateFile}:`, error);
    }
  }
}

main().catch((error) => {
  console.error("AST parser test failed:", error);
});
