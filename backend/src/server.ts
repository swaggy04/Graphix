import express from "express";
import analyticRoutes from "./routes/analytic-routes";
import cors from "cors";
import { runtimeConfig } from "./config/runtime-config";
import { isApplicationError } from "./utils/application-error";

const app = express();

// Parse JSON request bodies.

app.use(cors({ origin: runtimeConfig.corsOrigin }));
app.use(express.json({ limit: "16kb" }));

// API routes.
app.use("/api", analyticRoutes);

// Health check.
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

// Return consistent JSON for parser, rate-limit, and route errors.
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (isApplicationError(error)) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  const parserError = error as { type?: string };

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

const server = app.listen(runtimeConfig.port, () => {
  console.log(`Grapix backend running on http://localhost:${runtimeConfig.port}`);
});

server.requestTimeout = runtimeConfig.analysisTimeoutMs + 10_000;
server.keepAliveTimeout = 5_000;

const shutdown = (signal: string) => {
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
