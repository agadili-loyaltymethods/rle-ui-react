import type { ErrorRequestHandler } from "express";
import type { Logger } from "pino";

/**
 * Global Express error handler. Logs the error with pino and returns
 * a JSON response.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err: Error, req, res, _next) => {
    const statusCode =
      "statusCode" in err ? (err as Error & { statusCode: number }).statusCode : 500;

    logger.error(
      { err, reqId: req.id, method: req.method, url: req.originalUrl },
      "Unhandled error",
    );

    res.status(statusCode).json({
      error: err.message || "Internal Server Error",
    });
  };
}
