import path from "path";
import { createModuleResolver } from "../module-resolver.service";

async function main() {
  const repositoryPath = path.resolve(
    "src/services/tests/resolver-fixture",
  );

  const resolveModule = createModuleResolver(repositoryPath);

  console.log(
    "entry.ts + ./utils →",
    await resolveModule("entry.ts", "./utils"),
  );

  console.log(
    "entry.ts + ./db →",
    await resolveModule("entry.ts", "./db"),
  );
}

main().catch((error) => {
  console.error(error);
});