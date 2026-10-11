import type { NextFunction, Request, Response } from "express";
import { ApplicationError } from "../utils/application-error";

interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
}

export function createAnalysisRateLimit(options: {
  maxRequests: number;
  windowMs: number;
}) {
  const entries = new Map<string, RateLimitEntry>();

  return (req: Request, _res: Response, next: NextFunction) => {
    const now = Date.now();
    const clientKey = req.ip || req.socket.remoteAddress || "unknown";

    for (const [key, entry] of entries) {
      if (now - entry.windowStartedAt >= options.windowMs) {
        entries.delete(key);
      }
    }

    const current = entries.get(clientKey);

    if (!current || now - current.windowStartedAt >= options.windowMs) {
      entries.set(clientKey, {
        count: 1,
        windowStartedAt: now,
      });
      next();
      return;
    }

    if (current.count >= options.maxRequests) {
      next(
        new ApplicationError(
          "RATE_LIMIT_EXCEEDED",
          429,
          "Too many repository analyses. Please try again later.",
        ),
      );
      return;
    }

    current.count += 1;
    next();
  };
}
