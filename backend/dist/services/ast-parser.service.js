"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractImports = extractImports;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const parser_1 = require("@babel/parser");
async function extractImports(repositoryPath, relativeFilePath) {
    const absoluteFilePath = path_1.default.join(repositoryPath, relativeFilePath);
    const sourceCode = await (0, promises_1.readFile)(absoluteFilePath, "utf-8");
    const extension = path_1.default.extname(relativeFilePath).toLowerCase();
    const isTypeScript = extension === ".ts" || extension === ".tsx";
    const isJSX = extension === ".jsx" || extension === ".tsx" || extension === ".js";
    const plugins = [];
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
    const ast = (0, parser_1.parse)(sourceCode, {
        sourceType: "unambiguous",
        plugins,
    });
    const imports = new Set();
    const visit = (value) => {
        if (!value || typeof value !== "object") {
            return;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                visit(item);
            }
            return;
        }
        const node = value;
        if (node.type === "ImportDeclaration" || node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") {
            const source = node.source;
            if (source?.type === "StringLiteral" && typeof source.value === "string") {
                imports.add(source.value);
            }
        }
        if (node.type === "ImportExpression") {
            const source = node.source;
            if (source?.type === "StringLiteral" && typeof source.value === "string") {
                imports.add(source.value);
            }
        }
        if (node.type === "CallExpression") {
            const callee = node.callee;
            const argumentsList = node.arguments;
            const argument = argumentsList?.length === 1 ? argumentsList[0] : undefined;
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
//# sourceMappingURL=ast-parser.service.js.map