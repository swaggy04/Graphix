import { createDependencyGraph } from "../dependency-analyzer.service";

const result = createDependencyGraph([
  "src/app.ts",
  "src/utils.ts",
  "src/db.ts",
]);

console.log("Nodes:", result.graph.order);
console.log("Edges:", result.graph.size);
console.log(result.graph.nodes());