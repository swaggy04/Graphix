import Graph from "graphology";
import { randomUUID } from "crypto";
import { runtimeConfig } from "../config/runtime-config";

interface StoredAnalysis {
  graph: Graph;
  expiresAt: number;
  timer: NodeJS.Timeout;
}

const analysisStore = new Map<string, StoredAnalysis>();

export function storeAnalysis(graph: Graph): string {
  const analysisId = randomUUID();
  const expiresAt = Date.now() + runtimeConfig.analysisTtlMs;
  const timer = setTimeout(() => {
    deleteAnalysis(analysisId);
  }, runtimeConfig.analysisTtlMs);

  timer.unref?.();

  analysisStore.set(analysisId, { graph, expiresAt, timer });

  while (analysisStore.size > runtimeConfig.maxStoredAnalyses) {
    const oldestAnalysisId = analysisStore.keys().next().value;

    if (!oldestAnalysisId) {
      break;
    }

    deleteAnalysis(oldestAnalysisId);
  }

  return analysisId;
}

export function getAnalysis(analysisId: string): Graph | undefined {
  const storedAnalysis = analysisStore.get(analysisId);

  if (!storedAnalysis) {
    return undefined;
  }

  if (storedAnalysis.expiresAt <= Date.now()) {
    deleteAnalysis(analysisId);
    return undefined;
  }

  return storedAnalysis.graph;
}

export function deleteAnalysis(analysisId: string): boolean {
  const storedAnalysis = analysisStore.get(analysisId);

  if (!storedAnalysis) {
    return false;
  }

  clearTimeout(storedAnalysis.timer);
  return analysisStore.delete(analysisId);
}
