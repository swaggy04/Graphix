export interface GitHubRepository {
  owner: string;
  repo: string;
}

export function parseGitHubUrl(url: string): GitHubRepository {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com") {
    throw new Error("Only public GitHub repositories are supported");
  }

  const parts = parsedUrl.pathname.split("/").filter(Boolean);

  if (parts.length !== 2) {
    throw new Error("Invalid GitHub repository URL. Expected: https://github.com/<owner>/<repo>");
  }

  const owner = parts[0];
  const repo = parts[1];

  if (!owner || !repo) {
    throw new Error("GitHub owner and repository are required");
  }

  return {
    owner,
    repo,
  };
}
