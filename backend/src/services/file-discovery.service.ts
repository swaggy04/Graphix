import fg from "fast-glob";
import { stat } from "fs/promises";
import path from "path";

const MAX_SOURCE_FILES = 10_000;
const MAX_SOURCE_SIZE = 100 * 1024 * 1024;

const IGNORED_DIRECTORIES = ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/dist/**", "**/build/**", "**/coverage/**"];

export async function discoverSourceFiles(repositoryPath: string): Promise<string[]> {
  const files = await fg("**/*.{ts,tsx,js,jsx}", {
    cwd: repositoryPath,
    ignore: IGNORED_DIRECTORIES,
    onlyFiles: true,
    dot: true,
  });

  if (files.length > MAX_SOURCE_FILES) {
    throw new Error(`Repository contains too many source files. Maximum allowed is ${MAX_SOURCE_FILES}.`);
  }

  let totalSourceSize = 0;

  for (const file of files) {
    const filePath = path.join(repositoryPath, file);
    const stats = await stat(filePath);

    totalSourceSize += stats.size;

    if (totalSourceSize > MAX_SOURCE_SIZE) {
      throw new Error("Repository contains too much source code. Maximum allowed is 100 MB.");
    }
  }

  return files;
}
