import type { GraphViewModel } from "./graph-adapter";

export interface AnalysisStats {
  totalFiles: number;
  parsedFiles: number;
  failedFiles: number;
  resolvedImports: number;
  unresolvedImports: number;
  relativeImports: number;
  packageImports: number;
  builtinImports: number;
  unresolvedImportSpecifiers: string[];
}

export interface AnalyzeResponse extends GraphViewModel {
  stats: AnalysisStats;
}

export async function analyzeRepository(
  repositoryUrl: string,
): Promise<AnalyzeResponse> {
  const response = await fetch("http://localhost:3001/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositoryUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(error?.error ?? "Failed to analyze repository");
  }

  return response.json();
}
