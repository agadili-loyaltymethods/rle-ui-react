import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

const router = Router();

// Read version once at startup
let version = "0.0.0";
try {
  const pkgPath = path.resolve(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { version: string };
  version = pkg.version;
} catch {
  // swallow — version stays default
}

router.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    version,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Legacy compat
router.get("/app/status", (_req, res) => {
  res.json({ status: "OK" });
});

export { router as healthRouter };
