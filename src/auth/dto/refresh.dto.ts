import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const RefreshSchema = z.strictObject({
  refreshToken: z.string().min(40).meta({
    writeOnly: true,
    description: "Opaque refresh token returned by login",
  }),
});

export class RefreshDto extends createZodDto(RefreshSchema) {}
