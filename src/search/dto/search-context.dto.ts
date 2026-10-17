import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const SearchContextSchema = z.strictObject({
  query: z
    .string()
    .trim()
    .max(400)
    .regex(/^(?:\S+(?:\s+|$)){1,50}$/, { error: "Query must contain between 1 and 50 words" }),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(?:ALL|[A-Z]{2})$/)
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({
      description: "Country must be a valid 2 character country code or 'ALL'",
    }),
  searchLang: z
    .string()
    .regex(/^[a-z]{2,}$/)
    .nullish()
    .transform((value) => value ?? undefined),
  count: z
    .int()
    .min(1)
    .max(50)
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({ default: 10 }),
  maximumTokens: z
    .int()
    .min(1024)
    .max(8192)
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({ default: 4096 }),
  safesearch: z
    .enum(["off", "moderate", "strict"])
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({ default: "moderate" }),
  freshness: z
    .string()
    .regex(/^(pd|pw|pm|py|\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2})$/)
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({
      description:
        "Freshness filter for search results. Options: 'pd' (past day), 'pw' (past week), 'pm' (past month), 'py' (past year), or a custom date range in the format 'YYYY-MM-DDtoYYYY-MM-DD'.",
    }),
});

export class SearchContextDto extends createZodDto(SearchContextSchema) {}
