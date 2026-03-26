import type { RequestHandler } from "express";

/**
 * Redirects HTTP requests to HTTPS in production, using the
 * x-forwarded-proto header set by the load balancer / reverse proxy.
 */
export function httpsEnforce(isProduction: boolean): RequestHandler {
  return (req, res, next) => {
    if (
      isProduction &&
      req.headers["x-forwarded-proto"] !== "https" &&
      req.path !== "/health"
    ) {
      const host = req.headers.host ?? "";
      res.redirect(301, `https://${host}${req.originalUrl}`);
      return;
    }
    next();
  };
}
