import Graph from "graphology";

import {
  getDependencies,
  getDependents,
  getTransitiveDependencies,
  getTransitiveDependents,
} from "./dependency-query.service";

import { analyzeImpact } from "./impact-analysis.service";

export interface FileAnalysis {
  file: string;

  dependencies: {
    direct: string[];
    transitive: string[];
  };

  dependents: {
    direct: string[];
    transitive: string[];
  };

  impact: {
    affectedFiles: string[];
  };
}

export function analyzeFile(graph: Graph, file: string): FileAnalysis {
  const directDependencies = getDependencies(graph, file);
  const transitiveDependencies = getTransitiveDependencies(graph, file);

  const directDependents = getDependents(graph, file);
  const transitiveDependents = getTransitiveDependents(graph, file);

  const impact = analyzeImpact(graph, file);

  return {
    file,

    dependencies: {
      direct: directDependencies,
      transitive: transitiveDependencies,
    },

    dependents: {
      direct: directDependents,
      transitive: transitiveDependents,
    },

    impact: {
      affectedFiles: impact.affectedFiles,
    },
  };
}
