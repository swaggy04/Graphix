import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { discoverSourceFiles } from "../file-discovery.service";

async function main() {
  const testDirectory = path.join(tmpdir(), "grapix-source-size-test");

  await rm(testDirectory, {
    recursive: true,
    force: true,
  });

  await mkdir(testDirectory, {
    recursive: true,
  });

  console.log("Creating oversized source file...");

  const largeContent = "a".repeat(101 * 1024 * 1024);

  await writeFile(path.join(testDirectory, "large.ts"), largeContent);

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
