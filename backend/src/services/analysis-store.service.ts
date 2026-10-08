import Graph from "graphology";
import { randomUUID } from "crypto";

const ANALYSIS_TTL = process.env.ANALYSIS_TTL_MS ? Number(process.env.ANALYSIS_TTL_MS) : 30 * 60 * 1000;

const analysisStore = new Map<string, Graph>();

export function storeAnalysis(graph: Graph): string {
  const analysisId = randomUUID();

  analysisStore.set(analysisId, graph);

  setTimeout(() => {
    deleteAnalysis(analysisId);
  }, ANALYSIS_TTL);

  return analysisId;
}

export function getAnalysis(analysisId: string): Graph | undefined {
  return analysisStore.get(analysisId);
}

export function deleteAnalysis(analysisId: string): boolean {
  return analysisStore.delete(analysisId);
}
