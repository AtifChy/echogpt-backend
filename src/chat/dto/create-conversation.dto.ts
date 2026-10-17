import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateConversationSchema = z.strictObject({
  providerId: z
    .int()
    .positive()
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({ description: "Uses default provider if not specified" }),
  title: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(60))
    .nullish()
    .transform((value) => value ?? undefined)
    .meta({
      description: "Conversation title derived from the first prompt",
      minLength: 1,
      maxLength: 60,
    }),
});

export class CreateConversationDto extends createZodDto(CreateConversationSchema) {}
