import { z } from "zod";

// Brave can add fields independently of our public API. Only validate what we consume.
export const BraveContextResponseSchema = z.object({
  grounding: z
    .object({
      generic: z
        .array(
          z.object({
            url: z.string().optional(),
            title: z.string().optional(),
            // Preserve the client's filtering of empty and non-string snippets.
            snippets: z.array(z.unknown()).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  sources: z
    .record(
      z.string(),
      z.object({
        title: z.string().optional(),
        hostname: z.string().optional(),
        age: z.array(z.string()).optional(),
        snippet: z.string().optional(),
        site_name: z.string().optional(),
      }),
    )
    .optional(),
});
