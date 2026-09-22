import { cloneRepository } from "../repository.service";
import { discoverSourceFiles } from "../file-discovery.service";
import { extractImports } from "../ast-parser.service";
import { createModuleResolver } from "../module-resolver.service";

async function main() {
  const repositoryPath = await cloneRepository(
    "https://github.com/facebook/react",
  );

  const files = await discoverSourceFiles(repositoryPath);

  const resolveModule = createModuleResolver(repositoryPath);

  let candidateFile: string | undefined;
  let imports: string[] = [];

  for (const file of files) {
    if (!file.endsWith(".js") && !file.endsWith(".ts")) {
      continue;
    }

    try {
      const foundImports = await extractImports(repositoryPath, file);

      if (foundImports.length > 0) {
        candidateFile = file;
        imports = foundImports;
        break;
      }
    } catch {
      continue;
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
    const resolved = await resolveModule(candidateFile, importSpecifier);

    console.log(`\n${importSpecifier}`);
    console.log("→", resolved);
  }
}

main().catch((error) => {
  console.error("Module resolver test failed:", error);
});
