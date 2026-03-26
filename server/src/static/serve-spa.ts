import express, { type RequestHandler } from "express";
import path from "node:path";
import fs from "node:fs";

/**
 * Serves the Vite build output and provides SPA fallback for
 * client-side routing.
 *
 * - Hashed assets (assets/*) get aggressive caching (1 year)
 * - index.html is never cached
 * - Unmatched GET requests get index.html (SPA fallback)
 */
export function serveSpa(distPath: string): RequestHandler[] {
  const indexHtml = path.join(distPath, "index.html");

  // Static file serving with cache headers
  const staticHandler = express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    index: false, // Don't auto-serve index.html for "/"
    setHeaders: (res, filePath) => {
      // Only cache hashed assets aggressively
      if (!filePath.includes("/assets/")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  });

  // SPA fallback — serve index.html for any unmatched GET
  const spaFallback: RequestHandler = (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    // Don't serve index.html for API or OIDC routes
    if (
      req.path.startsWith("/api/") ||
      req.path.startsWith("/oidc/") ||
      req.path === "/health" ||
      req.path === "/app/status"
    ) {
      next();
      return;
    }

    if (!fs.existsSync(indexHtml)) {
      next();
      return;
    }

    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  };

  return [staticHandler, spaFallback];
}
