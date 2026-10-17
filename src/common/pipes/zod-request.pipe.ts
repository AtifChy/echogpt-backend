import { BadRequestException } from "@nestjs/common";
import { createZodValidationPipe } from "nestjs-zod";
import { z } from "zod";

export const ZodRequestPipe = createZodValidationPipe({
  createValidationException: (error) => {
    const messages =
      error instanceof z.ZodError
        ? error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
        : ["Request validation failed"];
    return new BadRequestException({ statusCode: 400, error: "Bad Request", message: messages });
  },
});
