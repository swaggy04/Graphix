import { builtinModules } from "node:module";

export type ImportKind = "relative" | "package" | "builtin";

const NODE_BUILTINS = new Set(
  builtinModules.flatMap((moduleName) => [
    moduleName,
    moduleName.startsWith("node:") ? moduleName.slice(5) : `node:${moduleName}`,
  ]),
);

export function classifyImport(importSpecifier: string): ImportKind {
  if (importSpecifier.startsWith("./") || importSpecifier.startsWith("../")) {
    return "relative";
  }

  if (
    importSpecifier.startsWith("node:") ||
    NODE_BUILTINS.has(importSpecifier)
  ) {
    return "builtin";
  }

  return "package";
}
