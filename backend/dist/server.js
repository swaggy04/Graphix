"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analytic_routes_1 = __importDefault(require("./routes/analytic-routes"));
const cors_1 = __importDefault(require("cors"));
const runtime_config_1 = require("./config/runtime-config");
const application_error_1 = require("./utils/application-error");
const app = (0, express_1.default)();
// Parse JSON request bodies.
app.use((0, cors_1.default)({ origin: runtime_config_1.runtimeConfig.corsOrigin }));
app.use(express_1.default.json({ limit: "16kb" }));
// API routes.
app.use("/api", analytic_routes_1.default);
// Health check.
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
    });
});
// Return consistent JSON for parser, rate-limit, and route errors.
app.use((error, _req, res, _next) => {
    if ((0, application_error_1.isApplicationError)(error)) {
        res.status(error.statusCode).json({
            error: {
                code: error.code,
                message: error.message,
            },
        });
        return;
    }
    const parserError = error;
    if (parserError.type === "entity.too.large") {
        res.status(413).json({
            error: {
                code: "REQUEST_BODY_TOO_LARGE",
                message: "Request body is too large.",
            },
        });
        return;
    }
    if (parserError.type === "entity.parse.failed") {
        res.status(400).json({
            error: {
                code: "INVALID_JSON",
                message: "Request body must contain valid JSON.",
            },
        });
        return;
    }
    console.error("Unhandled request error:", error);
    res.status(500).json({
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected server error occurred.",
        },
    });
});
const server = app.listen(runtime_config_1.runtimeConfig.port, () => {
    console.log(`Grapix backend running on http://localhost:${runtime_config_1.runtimeConfig.port}`);
});
server.requestTimeout = runtime_config_1.runtimeConfig.analysisTimeoutMs + 10_000;
server.keepAliveTimeout = 5_000;
const shutdown = (signal) => {
    console.log(`${signal} received. Closing the backend server.`);
    server.close((error) => {
        if (error) {
            console.error("Backend shutdown failed:", error);
            process.exitCode = 1;
            return;
        }
        console.log("Backend server closed.");
    });
};
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
//https://github.com/swaggy04/gitty.git
//# sourceMappingURL=server.js.map