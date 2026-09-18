import path from "path";
import resolve from "enhanced-resolve";
const resolver = resolve.create.promise({
  extensions: [".ts", ".tsx", ".js", ".jsx"],
});

export async function resolveModule(
  repositoryPath: string,
  importerFile: string,
  importSpecifier: string,
): Promise<string | null> {
  const absoluteImporterPath = path.join(repositoryPath, importerFile);

  const importerDirectory = path.dirname(absoluteImporterPath);

  try {
    const result = await resolver(importerDirectory, importSpecifier);

    if (!result) {
      return null;
    }

    const relativePath = path.relative(repositoryPath, result);

    return relativePath.split(path.sep).join("/");
  } catch {
    return null;
  }
}
