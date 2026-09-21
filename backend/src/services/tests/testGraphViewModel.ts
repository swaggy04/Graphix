import path from "path";
import { createDependencyGraph } from "../dependency-analyzer.service";
import { createGraphViewModel } from "../graph-view-model.service";

async function main() {
  const repositoryPath = path.resolve("src/services/tests/resolver-fixture");

  const result = await createDependencyGraph(repositoryPath, [
    "entry.ts",
    "utils.ts",
    "helper.ts",
    "db.ts",
  ]);

  const viewModel = createGraphViewModel(result.graph);

  console.log("\nView model nodes:");
  console.log(viewModel.nodes);

  console.log("\nView model edges:");
  console.log(viewModel.edges);
}

main().catch((error) => {
  console.error(error);
});
