export interface AnalyzeResponse {
  analysisId: string;

  nodes: {
    id: string;
    label: string;
  }[];

  edges: {
    id: string;
    source: string;
    target: string;
  }[];

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

const API_URL = "http://localhost:3001";

export async function analyzeRepository(
  repositoryUrl: string,
): Promise<AnalyzeResponse> {
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositoryUrl,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(data?.error || "Failed to analyze repository");
  }

  return response.json();
}
