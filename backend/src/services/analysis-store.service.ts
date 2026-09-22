import Graph from "graphology";
import { randomUUID } from "crypto";
const analysisStore = new Map<string, Graph>();
export function storeAnalysis(graph: Graph): string {
  const analysisId = randomUUID();
  analysisStore.set(analysisId, graph);
  return analysisId;
}

export function getAnalysis(analysisId: string): Graph | undefined {
  return analysisStore.get(analysisId);
}

export function deleteAnalysis(analysisId: string): boolean {
  return analysisStore.delete(analysisId);
}
