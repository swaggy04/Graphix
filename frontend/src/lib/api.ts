export interface AnalyzeResponse {
  analysisId: string;

  cycles: string[][];

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

export interface FileAnalysisResponse {
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getErrorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return fallback;
  }

  const error = (value as { error?: unknown }).error;

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? fallback);
  }

  return fallback;
}

function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<AnalyzeResponse>;

  return (
    typeof response.analysisId === "string" &&
    Array.isArray(response.nodes) &&
    Array.isArray(response.edges) &&
    Array.isArray(response.cycles) &&
    Boolean(response.stats)
  );
}

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

    throw new Error(getErrorMessage(data, "Failed to analyze repository"));
  }

  const data: unknown = await response.json();

  if (!isAnalyzeResponse(data)) {
    throw new Error("Backend returned an invalid analysis response");
  }

  return data;
}

export async function analyzeFile(
  analysisId: string,
  filePath: string,
  signal?: AbortSignal,
): Promise<FileAnalysisResponse> {
  const response = await fetch(
    `${API_URL}/api/analyze/${analysisId}/file/${encodeURIComponent(filePath)}`,
    { signal },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "File analysis failed"));
  }

  return data as FileAnalysisResponse;
}
