import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const SetEnabledProviderSchema = z.strictObject({
  enabled: z.boolean().meta({ description: "Whether the provider can be used for chat requests" }),
});

export class SetEnabledProviderDto extends createZodDto(SetEnabledProviderSchema) {}
