import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { parseGitHubUrl } from "../utils/github-url";

const execFileAsync = promisify(execFile);

const CLONE_TIMEOUT = process.env.CLONE_TIMEOUT_MS
  ? Number(process.env.CLONE_TIMEOUT_MS)
  : 60 * 1000;

export async function cloneRepository(url: string): Promise<string> {
  const { repo } = parseGitHubUrl(url);

  const tempDirectory = await mkdtemp(path.join(tmpdir(), "traceon-"));

  const repositoryPath = path.join(tempDirectory, repo);

  try {
    await execFileAsync("git", ["clone", "--depth", "1", url, repositoryPath], {
      timeout: CLONE_TIMEOUT,
    });

    return repositoryPath;
  } catch (error) {
    await rm(tempDirectory, {
      recursive: true,
      force: true,
    });

    throw error;
  }
}

export async function cleanupRepository(repositoryPath: string): Promise<void> {
  const tempDirectory = path.dirname(repositoryPath);

  await rm(tempDirectory, {
    recursive: true,
    force: true,
  });
}
