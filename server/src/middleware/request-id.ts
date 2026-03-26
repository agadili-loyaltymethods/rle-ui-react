import crypto from "node:crypto";
import type { RequestHandler } from "express";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Assigns a unique request ID from the incoming X-Request-ID header
 * or generates one with crypto.randomUUID(). Sets it on req.id and
 * echoes it back in the response header.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const id =
    (req.headers["x-request-id"] as string | undefined) ||
    crypto.randomUUID();
  req.id = id;
  res.setHeader("x-request-id", id);
  next();
};
