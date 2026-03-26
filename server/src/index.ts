import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { createApp } from "./app.js";

const config = loadConfig();
const logger = createLogger(config);
const app = createApp(config, logger);

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, "Server started");
});

// Keep-alive timeout — match ALB idle timeout (default 60s)
server.keepAliveTimeout = 65_000;

// Graceful shutdown
function shutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal, closing server...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  // Force exit after 10s if connections don't drain
  setTimeout(() => {
    logger.warn("Forcing exit after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection");
  process.exit(1);
});
