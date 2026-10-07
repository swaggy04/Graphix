import path from "path";
import resolve from "enhanced-resolve";
import { createMatchPath, loadConfig } from "tsconfig-paths";

export function createModuleResolver(repositoryPath: string) {
  const resolver = resolve.create.promise({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    mainFiles: ["index"],
  });

  const tsconfigResult = loadConfig(repositoryPath);

  const matchPath = tsconfigResult.resultType === "success" ? createMatchPath(tsconfigResult.absoluteBaseUrl, tsconfigResult.paths) : null;

  return async function resolveModule(importerFile: string, importSpecifier: string): Promise<string | null> {
    const absoluteImporterPath = path.join(repositoryPath, importerFile);

    const importerDirectory = path.dirname(absoluteImporterPath);

    try {
      let request = importSpecifier;

      if (matchPath) {
        const matchedPath = matchPath(importSpecifier, undefined, undefined, [".ts", ".tsx", ".js", ".jsx"]);

        if (matchedPath) {
          request = matchedPath;
        }
      }

      const result = await resolver(importerDirectory, request);

      if (!result) {
        return null;
      }

      const relativePath = path.relative(repositoryPath, result);

      return relativePath.split(path.sep).join("/");
    } catch {
      return null;
    }
  };
}
