import fg from "fast-glob";

const IGNORED_DIRECTORIES = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
];

export async function discoverSourceFiles(
  repositoryPath: string
): Promise<string[]> {
  return fg("**/*.{ts,tsx,js,jsx}", {
    cwd: repositoryPath,
    ignore: IGNORED_DIRECTORIES,
    onlyFiles: true,
    dot: true,
  });
}