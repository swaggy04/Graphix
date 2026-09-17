import { writeFile } from "fs/promises";
import path from "path";
import { extractImports } from "../ast-parser.service";

async function main() {
  const filePath = path.join(process.cwd(), "test-input.ts");

  await writeFile(
    filePath,
    `
import React from "react";
import Button from "./Button";
import { formatDate } from "../utils/date";

const name = "Grapix";
`,
    "utf-8"
  );

  const imports = await extractImports(filePath);

  console.log(imports);
}

main().catch(console.error);