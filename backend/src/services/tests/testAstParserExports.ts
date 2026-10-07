import path from "path";
import { extractImports } from "../ast-parser.service";

async function main() {
  const repositoryPath = path.resolve(
    process.cwd(),
    "src/services/tests/parser-fixture",
  );

  const files = [
    "entry.ts",
    "named-export.ts",
    "star-export.ts",
    "commonjs.ts",
  ];

  for (const file of files) {
    const imports = await extractImports(
      repositoryPath,
      file,
    );

    console.log(`\n${file}`);
    console.log(imports);
  }
}

main().catch((error) => {
  console.error("AST export test failed:", error);
});