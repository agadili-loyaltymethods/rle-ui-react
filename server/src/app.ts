import express from "express";
import { pinoHttp } from "pino-http";
import helmet from "helmet";
import path from "node:path";
import type { IncomingMessage } from "node:http";
import type { Logger } from "pino";
import type { Config } from "./config.js";
import { requestId } from "./middleware/request-id.js";
import { httpsEnforce } from "./middleware/https-enforce.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.js";
import { appConfigRouter } from "./routes/app-config.js";
import { createOidcRouter } from "./routes/oidc.js";
import { logoutRouter } from "./routes/logout.js";
import { createApiProxy } from "./proxy/api-proxy.js";
import { serveSpa } from "./static/serve-spa.js";

export function createApp(config: Config, logger: Logger): express.Express {
  const app = express();
  const isProduction = config.NODE_ENV === "production";

  // Trust proxy (running behind LB/nginx in prod)
  app.set("trust proxy", 1);

  // 1. Request ID
  app.use(requestId);

  // 2. HTTP request logging (skip /health to avoid noise)
  app.use(
    pinoHttp({
      logger,
      genReqId: (req: IncomingMessage) =>
        (req as IncomingMessage & { id: string }).id,
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          req.url === "/health" || req.url === "/app/status",
      },
    }),
  );

  // 3. Helmet security headers
  const frameAncestors = ["'self'"];
  if (config.OKTA_CONTENT_SP) {
    frameAncestors.push(...config.OKTA_CONTENT_SP.split(","));
  }
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          frameAncestors,
        },
      },
      strictTransportSecurity: config.DISABLE_HTTPS ? false : undefined,
    }),
  );

  // 4. HTTPS enforcement (production only, unless DISABLE_HTTPS is set)
  app.use(httpsEnforce(isProduction && !config.DISABLE_HTTPS));

  // 5. Health + app-config routes (short-circuit — no body parsing needed)
  app.use(healthRouter);
  app.use(appConfigRouter);

  // 6. OIDC + logout routes
  app.use(createOidcRouter(logger));
  app.use(logoutRouter);

  // 7. API proxy — BEFORE any body parsers (streams bodies as-is)
  app.use("/api", createApiProxy(config, logger));

  // 8-9. Static file serving + SPA fallback
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(serveSpa(distPath));

  // 10. Global error handler
  app.use(errorHandler(logger));

  return app;
}
