import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const CreateConversationSchema = z.strictObject({
  providerId: z
    .int()
    .positive()
    .nullable()
    .transform((value) => value ?? undefined)
    .optional()
    .meta({ description: "Uses default provider if not specified" }),
  title: z
    .string()
    .trim()
    .transform((value) => value.replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(60))
    .nullable()
    .transform((value) => value ?? undefined)
    .optional()
    .meta({
      minLength: 1,
      maxLength: 60,
    }),
});

export class CreateConversationDto extends createZodDto(CreateConversationSchema) {}
