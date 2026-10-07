import path from "path";
import { createModuleResolver } from "../module-resolver.service";

async function main() {
  const repositoryPath = path.resolve(process.cwd(), "src/services/tests/resolver-alias-fixture");

  const resolveModule = createModuleResolver(repositoryPath);

  const helperResult = await resolveModule("entry.ts", "@/helper");

  const buttonResult = await resolveModule("entry.ts", "@components/Button");

  console.log("@/helper:");
  console.log(helperResult);

  console.log("@components/Button:");
  console.log(buttonResult);
}

main().catch((error) => {
  console.error("Alias resolver test failed:", error);
});
