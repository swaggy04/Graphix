import fg from "fast-glob";

const MAX_SOURCE_FILES = 10_000;

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

  return files;
}
