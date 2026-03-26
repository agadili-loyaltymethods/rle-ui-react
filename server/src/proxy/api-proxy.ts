import { createProxyMiddleware } from "http-proxy-middleware";
import type { ServerResponse, IncomingMessage } from "node:http";
import type { Logger } from "pino";
import type { Config } from "../config.js";

/**
 * Creates the /api reverse proxy middleware.
 * Streams requests directly to rle-api without body parsing.
 *
 * Express strips the mount path from req.url when using app.use("/api", ...),
 * so we restore it via the pathRewrite callback using req.originalUrl.
 */
export function createApiProxy(config: Config, logger: Logger) {
  return createProxyMiddleware({
    target: config.API_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Restore the full original path (Express strips the mount prefix from req.url)
        const original = (req as IncomingMessage & { originalUrl?: string }).originalUrl;
        if (original) {
          proxyReq.path = original;
        }
      },
      error: (err, _req, res) => {
        logger.error({ err }, "API proxy error");
        if ("writeHead" in res && typeof res.writeHead === "function") {
          (res as unknown as ServerResponse)
            .writeHead(502, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Bad Gateway" }));
        }
      },
    },
  });
}
