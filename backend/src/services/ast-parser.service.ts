import { readFile } from "fs/promises";
import { parse } from "@swc/core";
import path from "path";

export async function extractImports(repositoryPath: string, relativeFilePath: string): Promise<string[]> {
  const absoluteFilePath = path.join(repositoryPath, relativeFilePath);

  const sourceCode = await readFile(absoluteFilePath, "utf-8");

  const extension = path.extname(relativeFilePath).toLowerCase();

  const isTypeScript = extension === ".ts" || extension === ".tsx";

  const isJSX = extension === ".js" || extension === ".jsx" || extension === ".tsx";

  const ast = await parse(sourceCode, {
    syntax: isTypeScript ? "typescript" : "ecmascript",
    tsx: isTypeScript && isJSX,
    jsx: !isTypeScript && isJSX,
  });

  const imports: string[] = [];

  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      imports.push(node.source.value);
    }
  }

  return imports;
}
