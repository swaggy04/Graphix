import { cloneRepository } from "../repository.service";
import { discoverSourceFiles } from "../file-discovery.service";
import { extractImports } from "../ast-parser.service";


async function main() {
  const repositoryPath = await cloneRepository(
    "https://github.com/facebook/react",
  );

  const files = await discoverSourceFiles(repositoryPath);

  let candidateFile: string | undefined;
  let imports: string[] = [];

  for (const file of files) {
    if (!file.endsWith(".js") && !file.endsWith(".ts")) {
      continue;
    }

    const foundImports = await extractImports(repositoryPath, file);

    if (foundImports.length > 0) {
      candidateFile = file;
      imports = foundImports;
      break;
    }
  }

  if (!candidateFile) {
    throw new Error("Could not find a source file containing imports");
  }

  console.log("Importer:");
  console.log(candidateFile);

  console.log("\nImports:");
  console.log(imports);

  for (const importSpecifier of imports) {
    const resolved = await resolveModule(
      repositoryPath,
      candidateFile,
      importSpecifier,
    );

    console.log(`\n${importSpecifier}`);
    console.log("→", resolved);
  }
}

main().catch((error) => {
  console.error("Module resolver test failed:", error);
});
