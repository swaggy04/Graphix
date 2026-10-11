import fg from "fast-glob";
import { stat } from "fs/promises";
import path from "path";
import { runtimeConfig } from "../config/runtime-config";
import {
  ApplicationError,
  throwIfAborted,
} from "../utils/application-error";

const IGNORED_DIRECTORIES = ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/dist/**", "**/build/**", "**/coverage/**"];

export async function discoverSourceFiles(
  repositoryPath: string,
  signal?: AbortSignal,
): Promise<string[]> {
  throwIfAborted(signal);

  const files = await fg("**/*.{ts,tsx,js,jsx}", {
    cwd: repositoryPath,
    ignore: IGNORED_DIRECTORIES,
    onlyFiles: true,
    dot: true,
  });

  if (files.length > runtimeConfig.maxSourceFiles) {
    throw new ApplicationError(
      "SOURCE_FILE_LIMIT_EXCEEDED",
      413,
      `Repository contains too many source files. Maximum allowed is ${runtimeConfig.maxSourceFiles}.`,
    );
  }

  let totalSourceSize = 0;

  for (const file of files) {
    throwIfAborted(signal);
    const filePath = path.join(repositoryPath, file);
    const stats = await stat(filePath);

    totalSourceSize += stats.size;

    if (totalSourceSize > runtimeConfig.maxSourceSizeBytes) {
      throw new ApplicationError(
        "SOURCE_SIZE_LIMIT_EXCEEDED",
        413,
        `Repository contains too much source code. Maximum allowed is ${Math.round(runtimeConfig.maxSourceSizeBytes / (1024 * 1024))} MB.`,
      );
    }
  }

  return files;
}
