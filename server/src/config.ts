import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  API_URL: z.string().url().default("http://localhost:3001"),

  // OIDC / Okta
  OKTA_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  OKTA_CLIENT_ID: z.string().default(""),
  OKTA_CLIENT_SECRET: z.string().default(""),
  OKTA_REDIRECT_URI: z.string().default(""),
  OKTA_AUTH_URL: z.string().default(""),
  OKTA_LOGOUT_URL: z.string().default(""),
  OKTA_TOKEN_URL: z.string().default(""),
  OKTA_API_UI_KEY: z.string().default(""),
  OKTA_AUTH_SCOPE: z.string().default("openid%20profile%20offline_access"),
  OKTA_TOKEN_FOR_CRUD: z.string().default("access_token"),
  OKTA_CONTENT_SP: z.string().default(""),
  OKTA_LOGIN_URL: z.string().default(""),

  // Feature flags
  SPECIAL_FLAGS: z.string().default(""),
  ACTIVITY_HISTORY_MODE: z.string().default("Current"),
  DECIMAL_PRECISION: z.coerce.number().default(2),
  ENABLE_AUTO_EXPIRATION: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // Security overrides
  DISABLE_HTTPS: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // Environment display
  ENV_DISPLAY_NAME: z.string().default(""),
  ENV_DISPLAY_COLOR: z.string().default(""),
});

export type Config = z.infer<typeof configSchema>;

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;
  _config = configSchema.parse(process.env);
  return _config;
}

export function getConfig(): Config {
  if (!_config) throw new Error("Config not loaded — call loadConfig() first");
  return _config;
}
