import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { MessageRoleSchema } from "../../common/schemas/enums.schema";
import { CountSchema, IdSchema, TimestampSchema } from "../../common/schemas/primitives.schema";

export const MessageSourceSchema = z.object({
  citation: IdSchema,
  title: z.string(),
  url: z.string(),
  hostname: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

export const MessageResponseSchema = z.object({
  id: IdSchema,
  role: MessageRoleSchema,
  content: z.string(),
  inputTokens: CountSchema,
  outputTokens: CountSchema,
  sources: z.array(MessageSourceSchema),
  createdAt: TimestampSchema,
});

export const SentMessageResponseSchema = MessageResponseSchema.extend({
  conversationId: IdSchema,
});
export const ChatResponseSchema = z.object({
  message: SentMessageResponseSchema,
});

export class MessageResponseDto extends createZodDto(MessageResponseSchema) {}
export class ChatResponseDto extends createZodDto(ChatResponseSchema) {}
export class MessageListResponseDto extends createZodDto(z.array(MessageResponseSchema)) {}
