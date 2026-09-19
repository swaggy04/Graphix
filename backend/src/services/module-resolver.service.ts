import path from "path";
import resolve from "enhanced-resolve";

export function createModuleResolver(repositoryPath: string) {
  const resolver = resolve.create.promise({
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    tsconfig: {
      configFile: path.join(repositoryPath, "tsconfig.json"),
    },
  });

  return async function resolveModule(
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
  };
}
