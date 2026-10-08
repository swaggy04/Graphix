import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function main() {
  try {
    await execFileAsync("node", ["-e", "setTimeout(() => {}, 5000)"], {
      timeout: 1000,
    });

    console.log("❌ Test failed: process did not timeout");
  } catch (error) {
    console.log("✅ Timeout triggered");

    const typedError = error as NodeJS.ErrnoException;

    console.log("Error code:", typedError.code);
  }
}

main().catch(console.error);
