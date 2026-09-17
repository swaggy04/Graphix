import { readFile } from "fs/promises";
import path from "path";
import { parse } from "@babel/parser";

export async function extractImports(repositoryPath: string, relativeFilePath: string): Promise<string[]> {
  const absoluteFilePath = path.join(repositoryPath, relativeFilePath);

  const sourceCode = await readFile(absoluteFilePath, "utf-8");

  const extension = path.extname(relativeFilePath).toLowerCase();

  const isTypeScript = extension === ".ts" || extension === ".tsx";

  const isJSX = extension === ".jsx" || extension === ".tsx" || extension === ".js";

  const plugins: ("typescript" | "jsx" | "flow" | "flowComments")[] = [];

  if (isTypeScript) {
    plugins.push("typescript");
  }

  if (isJSX) {
    plugins.push("jsx");
  }

  // React's repository contains Flow files.
  if (!isTypeScript) {
    plugins.push("flow");
  }

  const ast = parse(sourceCode, {
    sourceType: "unambiguous",
    plugins,
  });

  const imports: string[] = [];

  for (const node of ast.program.body) {
    if (node.type === "ImportDeclaration") {
      imports.push(node.source.value);
    }
  }

  return imports;
}
