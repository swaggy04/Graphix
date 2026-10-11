import path from "path";
import resolve from "enhanced-resolve";
import { createMatchPath, loadConfig } from "tsconfig-paths";

export function createModuleResolver(repositoryPath: string) {
  const resolver = resolve.create.promise({
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"],
    mainFiles: ["index"],
  });

  const resolutionCache = new Map<string, string | null>();

  const tsconfigResult = loadConfig(repositoryPath);

  const matchPath = tsconfigResult.resultType === "success" ? createMatchPath(tsconfigResult.absoluteBaseUrl, tsconfigResult.paths) : null;

  return async function resolveModule(importerFile: string, importSpecifier: string): Promise<string | null> {
    const cacheKey = `${importerFile}\0${importSpecifier}`;
    const cachedResult = resolutionCache.get(cacheKey);

    if (cachedResult !== undefined) {
      return cachedResult;
    }

    const absoluteImporterPath = path.join(repositoryPath, importerFile);

    const importerDirectory = path.dirname(absoluteImporterPath);

    const requests = [importSpecifier];

    if ([".js", ".jsx", ".mjs", ".cjs"].some((extension) => importSpecifier.endsWith(extension))) {
      requests.push(importSpecifier.slice(0, importSpecifier.lastIndexOf(".")));
    }

    for (const request of requests) {
      try {
        let resolvedRequest = request;

        if (matchPath) {
          const matchedPath = matchPath(request, undefined, undefined, [
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".mts",
            ".cts",
            ".mjs",
            ".cjs",
          ]);

          if (matchedPath) {
            resolvedRequest = matchedPath;
          }
        }

        const result = await resolver(importerDirectory, resolvedRequest);

        if (!result) {
          continue;
        }

        const relativePath = path.relative(repositoryPath, result);

        if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
          continue;
        }

        const normalizedPath = relativePath.split(path.sep).join("/");
        resolutionCache.set(cacheKey, normalizedPath);
        return normalizedPath;
      } catch {
        continue;
      }
    }

    resolutionCache.set(cacheKey, null);
    return null;
  };
}
