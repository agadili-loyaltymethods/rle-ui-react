import { Router } from "express";
import { getConfig } from "../config.js";

const router = Router();

/**
 * GET /api/config — returns runtime feature flags and environment display
 * info to the SPA. Mirrors the legacy /get-flags endpoint shape.
 */
router.get("/api/config", (_req, res) => {
  const config = getConfig();
  const flags = config.SPECIAL_FLAGS;

  res.json({
    flags: {
      disableMemberUnMerge: flags.includes("disableMemberUnMerge"),
      disableSearchFLName: flags.includes("disableSearchFLName"),
      disableSearchPhone: flags.includes("disableSearchPhone"),
      disableSearchEmail: flags.includes("disableSearchEmail"),
      disablePointsDivider: flags.includes("disablePointsDivider"),
      mode: config.ACTIVITY_HISTORY_MODE,
      decimalPrecision: config.DECIMAL_PRECISION,
      enableAutoExpiration: config.ENABLE_AUTO_EXPIRATION,
    },
    env: {
      name: config.ENV_DISPLAY_NAME,
      color: config.ENV_DISPLAY_COLOR,
    },
    oidcEnabled: config.OKTA_ENABLED,
  });
});

export { router as appConfigRouter };
