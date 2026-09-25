import Joi from "joi";

export const envValidationSchmea = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgres", "postgresql"] })
    .required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).default(7),
  CORS_ORIGINS: Joi.string().required(),
  PROVIDER_ENCRYPTION_KEY_BASE64: Joi.string().base64().required(),
  BRAVE_SEARCH_API_KEY: Joi.string().min(20).required(),
  SEARCH_CACHE_MINUTES: Joi.number().integer().min(1).default(60),
});
