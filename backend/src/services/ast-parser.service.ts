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

  {
    /* React's repository contains Flow files. */
  }

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
      continue;
    }

    if (node.type === "ExportNamedDeclaration" && node.source) {
      imports.push(node.source.value);
      continue;
    }

    if (node.type === "ExportAllDeclaration" && node.source) {
      imports.push(node.source.value);
      continue;
    }

    if (node.type === "VariableDeclaration") {
      for (const declaration of node.declarations) {
        const initializer = declaration.init;

        if (initializer?.type === "CallExpression" && initializer.callee.type === "Identifier" && initializer.callee.name === "require" && initializer.arguments.length === 1) {
          const argument = initializer.arguments[0];

          if (argument.type === "StringLiteral") {
            imports.push(argument.value);
          }
        }
      }
    }
  }

  return imports;
}
