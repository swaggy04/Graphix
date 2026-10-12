import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";

import { createModuleResolver } from "../services/module-resolver.service";

const aliasFixtureRoot = path.resolve(
  "src/services/tests/resolver-alias-fixture",
);

const resolverFixtureRoot = path.resolve("src/services/tests/resolver-fixture");

test("resolves TypeScript path aliases", async () => {
  const resolveModule = createModuleResolver(aliasFixtureRoot);

  assert.equal(await resolveModule("entry.ts", "@/helper"), "src/helper.ts");

  assert.equal(
    await resolveModule("entry.ts", "@components/Button"),
    "src/components/Button.ts",
  );
});

test("resolves relative imports without an extension", async () => {
  const resolveModule = createModuleResolver(resolverFixtureRoot);

  assert.equal(await resolveModule("entry.ts", "./helper"), "helper.ts");
});

test("returns null for a missing relative import", async () => {
  const resolveModule = createModuleResolver(resolverFixtureRoot);

  assert.equal(await resolveModule("entry.ts", "./does-not-exist"), null);
});

test("rejects imports that resolve outside the repository", async () => {
  const resolveModule = createModuleResolver(resolverFixtureRoot);

  assert.equal(
    await resolveModule("entry.ts", "../../../../../package.json"),
    null,
  );
});

test("resolves directory imports to index.ts", async () => {
  const resolveModule = createModuleResolver(resolverFixtureRoot);

  assert.equal(
    await resolveModule("entry.ts", "./widgets"),
    "widgets/index.ts",
  );
});

test("resolves JavaScript-extension imports to TypeScript source files", async () => {
  const resolveModule = createModuleResolver(resolverFixtureRoot);

  assert.equal(
    await resolveModule("entry.ts", "./helper.js"),
    "helper.ts",
  );
});
