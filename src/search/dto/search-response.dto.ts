import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const SearchSourceSchema = z.object({
  citation: IdSchema,
  title: z.string(),
  url: z.string(),
  snippets: z.array(z.string()),
  hostname: z.string().optional(),
  siteName: z.string().optional(),
  publishedAt: z.string().optional(),
});

export const SearchResponseSchema = z.object({
  searchId: IdSchema,
  query: z.string(),
  sources: z.array(SearchSourceSchema),
});

export const SearchHistoryResponseSchema = z.object({
  id: IdSchema,
  query: z.string(),
  createdAt: TimestampSchema,
});

export class SearchResponseDto extends createZodDto(SearchResponseSchema) {}
export class SearchHistoryResponseDto extends createZodDto(z.array(SearchHistoryResponseSchema)) {}
export class SuggestionsResponseDto extends createZodDto(z.array(z.string())) {}
