import type { Models } from "../prisma/contract";

type UserRole = Models.public_Role["name"];

export interface AuthUser {
  userId: number;
  sessionId: number;
  role: UserRole;
}
