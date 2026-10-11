import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, readdir, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { parseGitHubUrl } from "../utils/github-url";
import { runtimeConfig } from "../config/runtime-config";
import {
  ApplicationError,
  throwIfAborted,
} from "../utils/application-error";

const execFileAsync = promisify(execFile);

export async function cloneRepository(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  throwIfAborted(signal);
  const { repo } = parseGitHubUrl(url);

  const tempDirectory = await mkdtemp(path.join(tmpdir(), "traceon-"));

  const repositoryPath = path.join(tempDirectory, repo);

  try {
    await execFileAsync(
      "git",
      ["clone", "--depth", "1", url, repositoryPath],
      {
        timeout: runtimeConfig.cloneTimeoutMs,
        signal,
      },
    );

    const cloneSize = await getDirectorySize(repositoryPath, signal);

    if (cloneSize > runtimeConfig.maxCloneSizeBytes) {
      throw new ApplicationError(
        "CLONE_SIZE_LIMIT_EXCEEDED",
        413,
        `Repository clone exceeds the maximum allowed size of ${Math.round(runtimeConfig.maxCloneSizeBytes / (1024 * 1024))} MB.`,
      );
    }

    return repositoryPath;
  } catch (error) {
    try {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    } catch (cleanupError) {
      console.error("Failed to clean up failed clone:", cleanupError);
    }

    throwIfAborted(signal);

    if (error instanceof ApplicationError) {
      throw error;
    }

    if ((error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
      throw new ApplicationError(
        "CLONE_TIMEOUT",
        408,
        "Repository cloning exceeded the time limit.",
      );
    }

    throw new ApplicationError(
      "REPOSITORY_CLONE_FAILED",
      422,
      "The repository could not be cloned.",
    );
  }
}

async function getDirectorySize(directoryPath: string, signal?: AbortSignal): Promise<number> {
  throwIfAborted(signal);

  let total = 0;
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    throwIfAborted(signal);
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      total += await getDirectorySize(entryPath, signal);
    } else {
      total += (await stat(entryPath)).size;
    }

    if (total > runtimeConfig.maxCloneSizeBytes) {
      return total;
    }
  }

  return total;
}

export async function cleanupRepository(repositoryPath: string): Promise<void> {
  const tempDirectory = path.dirname(repositoryPath);

  await rm(tempDirectory, {
    recursive: true,
    force: true,
  });
}
