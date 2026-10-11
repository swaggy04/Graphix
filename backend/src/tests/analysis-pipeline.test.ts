import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import Graph from "graphology";

import { parseGitHubUrl } from "../utils/github-url";
import { extractImports } from "../services/ast-parser.service";
import { createDependencyGraph } from "../services/dependency-analyzer.service";
import { getTransitiveDependents } from "../services/dependency-query.service";
import { detectCycles } from "../services/cycle-detection.service";
import { analyzeFile } from "../services/file-analysis.service";

const fixtureRoot = path.resolve("src/services/tests/resolver-fixture");
const parserFixtureRoot = path.resolve("src/services/tests/parser-fixture");

test("accepts valid GitHub repository URLs", () => {
  assert.deepEqual(parseGitHubUrl("https://github.com/facebook/react"), {
    owner: "facebook",
    repo: "react",
  });
});

test("rejects non GitHub repository URLs with a typed error", () => {
  assert.throws(
    () => parseGitHubUrl("https://gitlab.com/facebook/react"),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "INVALID_REPOSITORY_URL",
  );
});

test("extracts imports from supported export and CommonJS syntax", async () => {
  const imports = await extractImports(parserFixtureRoot, "commonjs.ts");

  assert.deepEqual(imports, ["./imported"]);
});

test("builds internal dependency edges and separates external imports", async () => {
  const analysis = await createDependencyGraph(fixtureRoot, [
    "entry.ts",
    "utils.ts",
    "helper.ts",
    "db.ts",
  ]);

  assert.equal(analysis.graph.order, 4);
  assert.equal(analysis.graph.size, 3);
  assert.equal(analysis.stats.resolvedInternalImports, 3);
  assert.equal(analysis.stats.unresolvedImports, 0);
  assert.deepEqual(analysis.stats.unresolvedRelativeImportSpecifiers, []);
});

test("returns transitive dependents for impact analysis", async () => {
  const analysis = await createDependencyGraph(fixtureRoot, [
    "entry.ts",
    "utils.ts",
    "helper.ts",
    "db.ts",
  ]);

  assert.deepEqual(
    getTransitiveDependents(analysis.graph, "helper.ts"),
    ["utils.ts", "entry.ts"],
  );

  assert.deepEqual(analyzeFile(analysis.graph, "helper.ts").impact.affectedFiles, [
    "utils.ts",
    "entry.ts",
  ]);
});

test("detects multi-node and self-loop cycles", () => {
  const graph = new Graph({ type: "directed" });

  graph.mergeEdge("a.ts", "b.ts");
  graph.mergeEdge("b.ts", "a.ts");
  graph.mergeEdge("self.ts", "self.ts");

  const cycles = detectCycles(graph);

  assert.equal(cycles.length, 2);
  assert.ok(cycles.some((cycle) => cycle.length === 2));
  assert.ok(cycles.some((cycle) => cycle.length === 1));
});
