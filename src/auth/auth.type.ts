import type { AuthUser } from "../common/auth-user";

export interface AuthResponseUser {
  id: number;
  email: string;
  displayName: string | null;
  role: AuthUser["role"];
}

export interface AuthResponse {
  user: AuthResponseUser;
  accessToken: string;
  refreshToken: string;
}
