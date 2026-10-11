import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { discoverSourceFiles } from "../file-discovery.service";

async function main() {
  const testDirectory = path.join(
    tmpdir(),
    "grapix-file-limit-test",
  );

  await rm(testDirectory, {
    recursive: true,
    force: true,
  });

  await mkdir(testDirectory, {
    recursive: true,
  });

  console.log("Creating 301 test files...");

  for (let i = 0; i < 301; i++) {
    await writeFile(
      path.join(testDirectory, `file-${i}.ts`),
      "export const value = 1;",
    );
  }

  try {
    await discoverSourceFiles(testDirectory);

    console.error("❌ Test failed: repository was not rejected");
  } catch (error) {
    console.log("✅ Test passed");
    console.log((error as Error).message);
  } finally {
    await rm(testDirectory, {
      recursive: true,
      force: true,
    });
  }
}

main().catch(console.error);
