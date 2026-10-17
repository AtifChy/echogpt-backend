import { z } from "zod";

export const EnvSchema = z.looseObject({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().pipe(z.int().min(1).max(65535)).default(3000),
  DATABASE_URL: z.url().refine(
    (value) => {
      try {
        return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    },
    { error: "Expected a PostgreSQL URL" },
  ),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().min(1).default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().pipe(z.int().min(1)).default(7),
  CORS_ORIGINS: z.string().min(1),
  PROVIDER_ENCRYPTION_KEY_BASE64: z
    .base64()
    .refine((value) => Buffer.from(value, "base64").length === 32, {
      error: "Expected a base64-encoded 32-byte key",
    }),
  BRAVE_SEARCH_API_KEY: z.string().min(20),
  SEARCH_CACHE_MINUTES: z.coerce.number().pipe(z.int().min(1)).default(60),
});

export type Environment = z.output<typeof EnvSchema>;

export function validateEnv(values: Record<string, unknown>): Environment {
  const parsed = EnvSchema.safeParse(values);
  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${messages}`);
  }
  return parsed.data;
}
