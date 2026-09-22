import Graph from "graphology";
import { extractImports } from "./ast-parser.service";
import { createModuleResolver } from "./module-resolver.service";
import { classifyImport } from "../utils/import-classifier";
export interface DependencyAnalysis {
  graph: Graph;
  stats: {
    totalFiles: number;
    parsedFiles: number;
    failedFiles: number;
    resolvedImports: number;
    unresolvedImports: number;
    relativeImports: number;
    packageImports: number;
    builtinImports: number;
    unresolvedImportSpecifiers: string[];
  };
}

export async function createDependencyGraph(
  repositoryPath: string,
  files: string[],
): Promise<DependencyAnalysis> {
  const graph = new Graph({
    type: "directed",
  });

  const resolveModule = createModuleResolver(repositoryPath);

  let parsedFiles = 0;
  let failedFiles = 0;
  let resolvedImports = 0;
  let unresolvedImports = 0;

  let relativeImports = 0;
  let packageImports = 0;
  let builtinImports = 0;

  const unresolvedImportSpecifiers = new Set<string>();

  for (const file of files) {
    graph.addNode(file);
  }

  for (const file of files) {
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
        unresolvedImports++;
        unresolvedImportSpecifiers.add(imp);
        continue;
      }

      resolvedImports++;

      if (!graph.hasNode(resolvedFile)) {
        continue;
      }

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
      unresolvedImports,
      relativeImports,
      packageImports,
      builtinImports,
      unresolvedImportSpecifiers: Array.from(unresolvedImportSpecifiers),
    },
  };
}
