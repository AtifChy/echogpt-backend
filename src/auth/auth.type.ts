import type { z } from "zod";

import type {
  AuthResponseSchema,
  AuthResponseUserSchema,
  TokenPairSchema,
} from "./dto/auth-response.dto";

export type AuthResponseUser = z.output<typeof AuthResponseUserSchema>;
export type AuthResponse = z.output<typeof AuthResponseSchema>;
export type TokenPair = z.output<typeof TokenPairSchema>;
