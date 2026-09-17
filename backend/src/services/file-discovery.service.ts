import { readdir } from "fs/promises";
import path from "path";

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);

export async function discoverSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const nestedFiles = await discoverSourceFiles(fullPath);
      files.push(...nestedFiles);
    }

    if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();

      if (SUPPORTED_EXTENSIONS.has(extension)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}
