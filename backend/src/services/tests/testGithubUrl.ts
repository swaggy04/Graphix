import { parseGitHubUrl } from "../../../utils/github-url";

function testValidUrl() {
  const result = parseGitHubUrl(
    "https://github.com/facebook/react"
  );

  console.log("Valid URL:", result);
}

function testTrailingSlash() {
  const result = parseGitHubUrl(
    "https://github.com/facebook/react/"
  );

  console.log("Trailing slash:", result);
}

function testInvalidHost() {
  try {
    parseGitHubUrl(
      "https://gitlab.com/facebook/react"
    );
  } catch (error) {
    console.log(
      "Invalid host:",
      error instanceof Error ? error.message : error
    );
  }
}

function testInvalidPath() {
  try {
    parseGitHubUrl("https://github.com/facebook");
  } catch (error) {
    console.log(
      "Invalid path:",
      error instanceof Error ? error.message : error
    );
  }
}

function testInvalidUrl() {
  try {
    parseGitHubUrl("not-a-url");
  } catch (error) {
    console.log(
      "Invalid URL:",
      error instanceof Error ? error.message : error
    );
  }
}

testValidUrl();
testTrailingSlash();
testInvalidHost();
testInvalidPath();
testInvalidUrl();