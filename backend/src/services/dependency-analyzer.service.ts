import Graph from "graphology";
import { extractImports } from "./ast-parser.service";
import { createModuleResolver } from "./module-resolver.service";
import { classifyImport } from "../utils/import-classifier";
import { throwIfAborted } from "../utils/application-error";

export interface DependencyAnalysis {
  graph: Graph;
  stats: {
    totalFiles: number;
    parsedFiles: number;
    failedFiles: number;
    resolvedImports: number;
    resolvedInternalImports: number;
    externalImports: number;
    unresolvedImports: number;
    relativeImports: number;
    packageImports: number;
    builtinImports: number;
    unresolvedImportSpecifiers: string[];
    unresolvedRelativeImportSpecifiers: string[];
  };
}

export async function createDependencyGraph(
  repositoryPath: string,
  files: string[],
  signal?: AbortSignal,
): Promise<DependencyAnalysis> {
  const graph = new Graph({
    type: "directed",
  });

  const resolveModule = createModuleResolver(repositoryPath);

  let parsedFiles = 0;
  let failedFiles = 0;
  let resolvedImports = 0;
  let resolvedInternalImports = 0;
  let externalImports = 0;
  let unresolvedImports = 0;

  let relativeImports = 0;
  let packageImports = 0;
  let builtinImports = 0;

  const unresolvedImportSpecifiers = new Set<string>();
  const unresolvedRelativeImportSpecifiers = new Set<string>();

  for (const file of files) {
    throwIfAborted(signal);
    graph.addNode(file);
  }

  for (const file of files) {
    throwIfAborted(signal);
    let imports: string[];

    try {
      imports = await extractImports(repositoryPath, file);

      parsedFiles++;
    } catch {
      failedFiles++;
      console.log(`Skipped: ${file}`);
      continue;
    }

    for (const imp of imports) {
      throwIfAborted(signal);
      const kind = classifyImport(imp);

      if (kind === "relative") {
        relativeImports++;
      }

      if (kind === "package") {
        packageImports++;
      }

      if (kind === "builtin") {
        builtinImports++;
      }

      const resolvedFile = await resolveModule(file, imp);

      if (!resolvedFile) {
        if (kind === "relative") {
          unresolvedImports++;
          unresolvedImportSpecifiers.add(imp);
          unresolvedRelativeImportSpecifiers.add(imp);
        }

        continue;
      }

      if (!graph.hasNode(resolvedFile)) {
        externalImports++;
        continue;
      }

      resolvedImports++;
      resolvedInternalImports++;

      if (!graph.hasEdge(file, resolvedFile)) {
        graph.addEdge(file, resolvedFile);
      }
    }
  }

  return {
    graph,
    stats: {
      totalFiles: files.length,
      parsedFiles,
      failedFiles,
      resolvedImports,
      resolvedInternalImports,
      externalImports,
      unresolvedImports,
      relativeImports,
      packageImports,
      builtinImports,
      unresolvedImportSpecifiers: Array.from(unresolvedImportSpecifiers),
      unresolvedRelativeImportSpecifiers: Array.from(unresolvedRelativeImportSpecifiers),
    },
  };
}
