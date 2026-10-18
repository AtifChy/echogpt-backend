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

export const SearchContextResultSchema = z.object({
  query: z.string(),
  sources: z.array(SearchSourceSchema),
});

export const SearchResponseSchema = SearchContextResultSchema.extend({
  searchId: IdSchema,
});

export const SearchHistoryItemSchema = z.object({
  id: IdSchema,
  query: z.string(),
  createdAt: TimestampSchema,
});

export const SearchHistoryResponseSchema = z.array(SearchHistoryItemSchema);
export const SuggestionsResponseSchema = z.array(z.string());

export class SearchResponseDto extends createZodDto(SearchResponseSchema) {}
export class SearchHistoryResponseDto extends createZodDto(SearchHistoryResponseSchema) {}
export class SuggestionsResponseDto extends createZodDto(SuggestionsResponseSchema) {}
