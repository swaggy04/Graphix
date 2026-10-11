"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverSourceFiles = discoverSourceFiles;
const fast_glob_1 = __importDefault(require("fast-glob"));
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const runtime_config_1 = require("../config/runtime-config");
const application_error_1 = require("../utils/application-error");
const IGNORED_DIRECTORIES = ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/dist/**", "**/build/**", "**/coverage/**"];
async function discoverSourceFiles(repositoryPath, signal) {
    (0, application_error_1.throwIfAborted)(signal);
    const files = await (0, fast_glob_1.default)("**/*.{ts,tsx,js,jsx}", {
        cwd: repositoryPath,
        ignore: IGNORED_DIRECTORIES,
        onlyFiles: true,
        dot: true,
    });
    if (files.length > runtime_config_1.runtimeConfig.maxSourceFiles) {
        throw new application_error_1.ApplicationError("SOURCE_FILE_LIMIT_EXCEEDED", 413, `Repository contains too many source files. Maximum allowed is ${runtime_config_1.runtimeConfig.maxSourceFiles}.`);
    }
    let totalSourceSize = 0;
    for (const file of files) {
        (0, application_error_1.throwIfAborted)(signal);
        const filePath = path_1.default.join(repositoryPath, file);
        const stats = await (0, promises_1.stat)(filePath);
        totalSourceSize += stats.size;
        if (totalSourceSize > runtime_config_1.runtimeConfig.maxSourceSizeBytes) {
            throw new application_error_1.ApplicationError("SOURCE_SIZE_LIMIT_EXCEEDED", 413, `Repository contains too much source code. Maximum allowed is ${Math.round(runtime_config_1.runtimeConfig.maxSourceSizeBytes / (1024 * 1024))} MB.`);
        }
    }
    return files;
}
//# sourceMappingURL=file-discovery.service.js.map