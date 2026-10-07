import path from "path";
import { createModuleResolver } from "../module-resolver.service";

async function main() {
  const repositoryPath = path.resolve(process.cwd(), "src/services/tests/resolver-alias-fixture");

  const resolveModule = createModuleResolver(repositoryPath);

  const resolved = await resolveModule("entry.ts", "@/helper");

  console.log("Resolved alias:");
  console.log(resolved);
}

main().catch((error) => {
  console.error("Alias resolver test failed:", error);
});
