import { discoverSourceFiles } from "./file-discovery.service";
import { extractImports } from "./ast-parser.service";

export type ParsedFile = {
  path: string;
  imports: string[];
  error?: string;
};

export async function analyzeRepo(repositoryPath: string): Promise<ParsedFile[]> {
  const sourceFiles = await discoverSourceFiles(repositoryPath);

  const results: ParsedFile[] = [];

  for (const file of sourceFiles) {
    try {
      const imports = await extractImports(repositoryPath, file);

      results.push({
        path: file,
        imports,
      });
    } catch (error) {
      results.push({
        path: file,
        imports: [],
        error: error instanceof Error ? error.message : "Unknown parsing error",
      });
    }
  }

  return results;
}
