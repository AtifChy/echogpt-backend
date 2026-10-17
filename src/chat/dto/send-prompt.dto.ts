import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const SendPromptSchema = z.strictObject({
  conversationId: z.int().positive(),
  prompt: z.string().min(1).max(20_000),
  webSearch: z
    .boolean()
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({ default: false }),
});

export class SendPromptDto extends createZodDto(SendPromptSchema) {}
