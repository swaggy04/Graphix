import { readFile } from "fs/promises";
import { parse } from "@swc/core";

export async function extractImports(filePath: string): Promise<string[]> {
  const sourceCode = await readFile(filePath, "utf-8");

  const ast = await parse(sourceCode, {
    syntax: "typescript",
    tsx: filePath.endsWith(".tsx"),
  });

  const imports: string[] = [];

  for (const node of ast.body) {
    if (node.type === "ImportDeclaration") {
      imports.push(node.source.value);
    }
  }

  return imports;
}
