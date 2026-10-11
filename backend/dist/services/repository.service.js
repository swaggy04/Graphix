"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRepository = cloneRepository;
exports.cleanupRepository = cleanupRepository;
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const github_url_1 = require("../utils/github-url");
const runtime_config_1 = require("../config/runtime-config");
const application_error_1 = require("../utils/application-error");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
async function cloneRepository(url, signal) {
    (0, application_error_1.throwIfAborted)(signal);
    const { repo } = (0, github_url_1.parseGitHubUrl)(url);
    const tempDirectory = await (0, promises_1.mkdtemp)(path_1.default.join((0, os_1.tmpdir)(), "traceon-"));
    const repositoryPath = path_1.default.join(tempDirectory, repo);
    try {
        await execFileAsync("git", ["clone", "--depth", "1", url, repositoryPath], {
            timeout: runtime_config_1.runtimeConfig.cloneTimeoutMs,
            signal,
        });
        const cloneSize = await getDirectorySize(repositoryPath, signal);
        if (cloneSize > runtime_config_1.runtimeConfig.maxCloneSizeBytes) {
            throw new application_error_1.ApplicationError("CLONE_SIZE_LIMIT_EXCEEDED", 413, `Repository clone exceeds the maximum allowed size of ${Math.round(runtime_config_1.runtimeConfig.maxCloneSizeBytes / (1024 * 1024))} MB.`);
        }
        return repositoryPath;
    }
    catch (error) {
        try {
            await (0, promises_1.rm)(tempDirectory, {
                recursive: true,
                force: true,
            });
        }
        catch (cleanupError) {
            console.error("Failed to clean up failed clone:", cleanupError);
        }
        (0, application_error_1.throwIfAborted)(signal);
        if (error instanceof application_error_1.ApplicationError) {
            throw error;
        }
        if (error.code === "ETIMEDOUT") {
            throw new application_error_1.ApplicationError("CLONE_TIMEOUT", 408, "Repository cloning exceeded the time limit.");
        }
        throw new application_error_1.ApplicationError("REPOSITORY_CLONE_FAILED", 422, "The repository could not be cloned.");
    }
}
async function getDirectorySize(directoryPath, signal) {
    (0, application_error_1.throwIfAborted)(signal);
    let total = 0;
    const entries = await (0, promises_1.readdir)(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
        (0, application_error_1.throwIfAborted)(signal);
        const entryPath = path_1.default.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            total += await getDirectorySize(entryPath, signal);
        }
        else {
            total += (await (0, promises_1.stat)(entryPath)).size;
        }
        if (total > runtime_config_1.runtimeConfig.maxCloneSizeBytes) {
            return total;
        }
    }
    return total;
}
async function cleanupRepository(repositoryPath) {
    const tempDirectory = path_1.default.dirname(repositoryPath);
    await (0, promises_1.rm)(tempDirectory, {
        recursive: true,
        force: true,
    });
}
//# sourceMappingURL=repository.service.js.map