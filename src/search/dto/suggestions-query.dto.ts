import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const SuggestionQuerySchema = z.strictObject({
  q: z.string().trim().min(1).max(100),
});

export class SuggestionQueryDto extends createZodDto(SuggestionQuerySchema) {}
