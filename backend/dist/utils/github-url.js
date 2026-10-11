"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGitHubUrl = parseGitHubUrl;
const application_error_1 = require("./application-error");
function parseGitHubUrl(url) {
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    }
    catch {
        throw new application_error_1.ApplicationError("INVALID_REPOSITORY_URL", 400, "Invalid URL");
    }
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "github.com") {
        throw new application_error_1.ApplicationError("INVALID_REPOSITORY_URL", 400, "Only public GitHub repositories are supported");
    }
    const parts = parsedUrl.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) {
        throw new application_error_1.ApplicationError("INVALID_REPOSITORY_URL", 400, "Invalid GitHub repository URL. Expected: https://github.com/<owner>/<repo>");
    }
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) {
        throw new application_error_1.ApplicationError("INVALID_REPOSITORY_URL", 400, "GitHub owner and repository are required");
    }
    return {
        owner,
        repo,
    };
}
//# sourceMappingURL=github-url.js.map