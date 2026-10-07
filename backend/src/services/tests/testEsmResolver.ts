import path from "path";
import { createModuleResolver } from "../module-resolver.service";

async function main() {
  const repositoryPath = path.resolve(
    "src/services/tests/resolver-esm-fixture",
  );

  const resolveModule = createModuleResolver(
    repositoryPath,
  );

  const result = await resolveModule(
    "entry.ts",
    "./helper.js",
  );

  console.log("Resolved:", result);
}

main().catch((error) => {
  console.error(error);
});