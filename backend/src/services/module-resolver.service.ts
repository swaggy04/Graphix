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

    const requests = [importSpecifier];

    if (importSpecifier.endsWith(".js") || importSpecifier.endsWith(".jsx")) {
      requests.push(importSpecifier.slice(0, importSpecifier.lastIndexOf(".")));
    }

    for (const request of requests) {
      try {
        let resolvedRequest = request;

        if (matchPath) {
          const matchedPath = matchPath(request, undefined, undefined, [".ts", ".tsx", ".js", ".jsx"]);

          if (matchedPath) {
            resolvedRequest = matchedPath;
          }
        }

        const result = await resolver(importerDirectory, resolvedRequest);

        if (!result) {
          continue;
        }

        const relativePath = path.relative(repositoryPath, result);

        return relativePath.split(path.sep).join("/");
      } catch {
        continue;
      }
    }

    return null;
  };
}
