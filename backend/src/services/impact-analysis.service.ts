import Graph from "graphology";
import { getTransitiveDependents } from "./dependency-query.service";

export interface ImpactAnalysis {
  changedFile: string;
  affectedFiles: string[];
}

export function analyzeImpact(
  graph: Graph,
  changedFile: string,
): ImpactAnalysis {
  if (!graph.hasNode(changedFile)) {
    return {
      changedFile,
      affectedFiles: [],
    };
  }

  const affectedFiles = getTransitiveDependents(
    graph,
    changedFile,
  );

  return {
    changedFile,
    affectedFiles,
  };
}