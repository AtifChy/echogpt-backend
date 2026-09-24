import type { UserRole } from "../common/user-role";

export interface AuthResponseUser {
  id: number;
  email: string;
  displayName: string | null;
  role: UserRole;
}

export interface AuthResponse {
  user: AuthResponseUser;
  accessToken: string;
  refreshToken: string;
}
