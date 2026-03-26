import { Router } from "express";
import { getConfig } from "../config.js";

const router = Router();

/**
 * GET /oidc/logout — returns the Okta logout URL if OIDC is enabled,
 * or a simple message if not. The SPA redirects the browser to
 * this URL to trigger Okta logout.
 */
router.get("/oidc/logout", (_req, res) => {
  const config = getConfig();

  if (config.OKTA_ENABLED && config.OKTA_LOGOUT_URL) {
    res.json({ logoutUrl: config.OKTA_LOGOUT_URL });
  } else {
    res.json({ logoutUrl: null });
  }
});

export { router as logoutRouter };
