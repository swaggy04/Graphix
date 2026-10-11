"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationError = void 0;
exports.throwIfAborted = throwIfAborted;
exports.isApplicationError = isApplicationError;
class ApplicationError extends Error {
    code;
    statusCode;
    constructor(code, statusCode, message) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = "ApplicationError";
    }
}
exports.ApplicationError = ApplicationError;
function throwIfAborted(signal) {
    if (!signal?.aborted) {
        return;
    }
    const reason = signal.reason;
    if (reason instanceof Error) {
        throw reason;
    }
    throw new ApplicationError("ANALYSIS_CANCELLED", 499, "Repository analysis was cancelled");
}
function isApplicationError(error) {
    return error instanceof ApplicationError;
}
//# sourceMappingURL=application-error.js.map