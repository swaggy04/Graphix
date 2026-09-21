import path from "path";
import { createDependencyGraph } from "../dependency-analyzer.service";
import {
  getDependencies,
  getDependents,
  getTransitiveDependencies,
  getTransitiveDependents,
} from "../dependency-query.service";
import { analyzeImpact } from "../impact-analysis.service";

async function main() {
  const repositoryPath = path.resolve("src/services/tests/resolver-fixture");

  const result = await createDependencyGraph(repositoryPath, [
    "entry.ts",
    "utils.ts",
    "helper.ts",
    "db.ts",
  ]);

  console.log("\nAnalysis stats:");
  console.log(result.stats);

  console.log("\nGraph nodes:");
  console.log(result.graph.nodes());

  console.log("\nGraph edges:");

  for (const edge of result.graph.edges()) {
    console.log(`${result.graph.source(edge)} → ${result.graph.target(edge)}`);
  }

  console.log("\nGraph size:");
  console.log(result.graph.size);

  console.log("\nDirect queries:");

  console.log("\nentry.ts dependencies:");
  console.log(getDependencies(result.graph, "entry.ts"));

  console.log("\nutils.ts dependents:");
  console.log(getDependents(result.graph, "utils.ts"));

  console.log("\ndb.ts dependents:");
  console.log(getDependents(result.graph, "db.ts"));

  console.log("\nTransitive queries:");

  console.log("\nentry.ts transitive dependencies:");
  console.log(getTransitiveDependencies(result.graph, "entry.ts"));

  console.log("\nutils.ts transitive dependents:");
  console.log(getTransitiveDependents(result.graph, "utils.ts"));

  console.log("\ndb.ts transitive dependents:");
  console.log(getTransitiveDependents(result.graph, "db.ts"));

  console.log("\nhelper.ts transitive dependents:");
  console.log(getTransitiveDependents(result.graph, "helper.ts"));

  console.log("\nImpact analysis:");

  console.log("\nIf helper.ts changes:");
  console.log(analyzeImpact(result.graph, "helper.ts"));

  console.log("\nIf utils.ts changes:");
  console.log(analyzeImpact(result.graph, "utils.ts"));

  console.log("\nIf db.ts changes:");
  console.log(analyzeImpact(result.graph, "db.ts"));
}

main().catch((error) => {
  console.error(error);
});
