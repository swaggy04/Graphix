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

  const imports = new Set<string>();

  type AstNode = {
    type?: string;
    [key: string]: unknown;
  };

  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }

      return;
    }

    const node = value as AstNode;

    if (node.type === "ImportDeclaration" || node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") {
      const source = node.source as AstNode | undefined;

      if (source?.type === "StringLiteral" && typeof source.value === "string") {
        imports.add(source.value);
      }
    }

    if (node.type === "ImportExpression") {
      const source = node.source as AstNode | undefined;

      if (source?.type === "StringLiteral" && typeof source.value === "string") {
        imports.add(source.value);
      }
    }

    if (node.type === "CallExpression") {
      const callee = node.callee as AstNode | undefined;
      const argumentsList = node.arguments as unknown[] | undefined;
      const argument = argumentsList?.length === 1 ? argumentsList[0] as AstNode | undefined : undefined;

      const isRequireCall = callee?.type === "Identifier" && callee.name === "require";
      const isDynamicImportCall = callee?.type === "Import";

      if ((isRequireCall || isDynamicImportCall) && argument?.type === "StringLiteral" && typeof argument.value === "string") {
        imports.add(argument.value);
      }
    }

    for (const child of Object.values(node)) {
      visit(child);
    }
  };

  visit(ast.program);

  return Array.from(imports);
}
