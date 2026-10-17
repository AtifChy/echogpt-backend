import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const ConversationResponseSchema = z.object({
  id: IdSchema,
  title: z.string(),
  providerId: IdSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const CreateConversationResponseSchema = ConversationResponseSchema.extend({
  userId: IdSchema,
});

export class ConversationResponseDto extends createZodDto(ConversationResponseSchema) {}
export class CreateConversationResponseDto extends createZodDto(CreateConversationResponseSchema) {}
export class ConversationListResponseDto extends createZodDto(
  z.array(ConversationResponseSchema),
) {}
