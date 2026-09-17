import { readdir } from "fs/promises";
import path from "path";

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);

export async function discoverSourceFiles(repositoryPath: string): Promise<string[]> {
  const files: string[] = [];

  await walkDirectory(repositoryPath, repositoryPath, files);

  return files;
}

async function walkDirectory(currentDirectory: string, repositoryPath: string, files: string[]): Promise<void> {
  const entries = await readdir(currentDirectory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(currentDirectory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      await walkDirectory(fullPath, repositoryPath, files);
      continue;
    }

    if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();

      if (SUPPORTED_EXTENSIONS.has(extension)) {
        const relativePath = path.relative(repositoryPath, fullPath);

        files.push(relativePath.split(path.sep).join("/"));
      }
    }
  }
}
