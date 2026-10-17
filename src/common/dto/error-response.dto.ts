import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const ErrorResponseSchema = z.object({
  statusCode: z.int().min(400).max(599),
  error: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
});

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
