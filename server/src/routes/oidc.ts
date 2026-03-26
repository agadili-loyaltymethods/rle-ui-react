import { Router } from "express";
import crypto from "node:crypto";
import { getConfig } from "../config.js";
import type { Logger } from "pino";

export function createOidcRouter(logger: Logger): Router {
  const router = Router();

  /**
   * GET /oidc/login — initiates Okta authorization code flow by redirecting
   * the browser to the Okta authorize endpoint.
   */
  router.get("/oidc/login", (_req, res) => {
    const config = getConfig();

    if (!config.OKTA_ENABLED) {
      res.redirect("/login");
      return;
    }

    const state = crypto.randomUUID();

    const url =
      `${config.OKTA_AUTH_URL}?response_type=code&response_mode=query` +
      `&scope=${config.OKTA_AUTH_SCOPE}` +
      `&client_id=${config.OKTA_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(config.OKTA_REDIRECT_URI)}` +
      `&state=${state}`;

    logger.info("Redirecting to Okta authorize endpoint");
    res.redirect(url);
  });

  /**
   * GET /oidc/callback — Okta redirects here after user authenticates.
   * Exchanges the authorization code for tokens, then calls rle-api
   * POST /api/oidcsync to create/sync the local user, and finally
   * redirects the browser to /oidc/complete with token + username.
   */
  router.get("/oidc/callback", async (req, res) => {
    const config = getConfig();

    if (req.query.error) {
      const errorDesc =
        (req.query.error_description as string) || (req.query.error as string);
      logger.error({ error: req.query.error, errorDesc }, "OIDC callback error");
      res.redirect(`/oidc/complete?error=${encodeURIComponent(errorDesc)}`);
      return;
    }

    const code = req.query.code as string | undefined;
    if (!code) {
      res.redirect("/oidc/complete?error=Missing%20authorization%20code");
      return;
    }

    try {
      // Exchange authorization code for tokens
      const basicAuth = Buffer.from(
        `${config.OKTA_CLIENT_ID}:${config.OKTA_CLIENT_SECRET}`,
      ).toString("base64");

      const tokenRes = await fetch(config.OKTA_TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=authorization_code&redirect_uri=${encodeURIComponent(config.OKTA_REDIRECT_URI)}&code=${code}`,
      });

      if (!tokenRes.ok) {
        const body = (await tokenRes.json()) as { error_description?: string; error?: string };
        const msg = body.error_description || body.error || "Token exchange failed";
        logger.error({ status: tokenRes.status, body }, "Okta token exchange failed");
        res.redirect(`/oidc/complete?error=${encodeURIComponent(msg)}`);
        return;
      }

      const tokens = (await tokenRes.json()) as {
        access_token: string;
        id_token: string;
        [key: string]: unknown;
      };

      // Call rle-api oidcsync
      const syncRes = await fetch(`${config.API_URL}/api/oidcsync`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_token: tokens.access_token,
          id_token: tokens.id_token,
          secret: config.OKTA_API_UI_KEY,
        }),
      });

      if (!syncRes.ok) {
        const body = (await syncRes.json().catch(() => ({}))) as { message?: string };
        const msg = body.message || "OIDC sync failed";
        logger.error({ status: syncRes.status, body }, "oidcsync call failed");
        res.redirect(`/oidc/complete?error=${encodeURIComponent(msg)}`);
        return;
      }

      const syncData = (await syncRes.json()) as { login: string; token: string };

      logger.info({ login: syncData.login }, "OIDC login successful");

      res.redirect(
        `/oidc/complete?token=${encodeURIComponent(syncData.token)}&username=${encodeURIComponent(syncData.login)}`,
      );
    } catch (err) {
      logger.error({ err }, "OIDC callback unexpected error");
      res.redirect("/oidc/complete?error=Internal%20server%20error");
    }
  });

  return router;
}
