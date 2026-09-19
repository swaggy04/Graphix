export type ImportKind = "relative" | "package" | "builtin";

const NODE_BUILTINS = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "crypto",
  "dgram",
  "dns",
  "events",
  "fs",
  "http",
  "https",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "worker_threads",
  "zlib",
]);

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
