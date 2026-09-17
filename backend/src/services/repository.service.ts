import { execFile } from "child_process";
import { promisify } from "util";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { parseGitHubUrl } from "../../utils/github-url";

const execFileAsync = promisify(execFile);
export async function cloneRepository(url: string): Promise<string> {
  const { repo } = parseGitHubUrl(url);
  const tempDirectory = await mkdtemp(path.join(tmpdir(), "traceon-"));
  const repositoryPath = path.join(tempDirectory, repo);

  await execFileAsync("git", ["clone", "--depth", "1", url, repositoryPath]);

  return repositoryPath;
}
