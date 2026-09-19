import Graph from "graphology";
import { extractImports } from "./ast-parser.service";
import { resolveModule } from "./module-resolver.service";

export interface DependencyAnalysis {
  graph: Graph;
}
export async function createDependencyGraph(
  repositoryPath: string,
  files: string[],
): Promise<DependencyAnalysis> {
  const graph = new Graph({
    type: "directed",
  });

  for (const file of files) {
    graph.addNode(file);
  }
  for (const file of files) {
    const imports = await extractImports(repositoryPath, file);
    for (const imp of imports) {
      const resolvedFile = resolveModule(repositoryPath, file, imp);
      if (!resolvedFile) {
        continue;
      }

      if (!graph.hasNode(resolvedFile)) {
        continue;
      }

      if (!graph.hasEdge(file, resolvedFile)) {
        graph.addEdge(file, resolvedFile);
      }
    }
  }

  return { graph };
}
