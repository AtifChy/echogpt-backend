export interface AuthUser {
  userId: number;
  sessionId: number;
  role: "USER" | "ADMIN";
}
