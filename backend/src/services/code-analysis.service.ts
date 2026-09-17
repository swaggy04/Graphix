import { discoverSourceFiles } from "./file-discovery.service";
import { extractImports } from "./ast-parser.service";

export type ParsedFile = {
  path: string;
  imports: string[];
};

export async function analyzeRepo(repositoryPath: string): Promise<ParsedFile[]> {
  const sourcefile = await discoverSourceFiles(repositoryPath);
  const results: ParsedFile[] = [];
  for (const file of sourcefile) {
    const imports = await extractImports(repositoryPath, file);
    results.push({
      path: file,
      imports: imports,
    });
  }

  return results;
}
