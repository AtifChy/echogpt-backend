export const USER_ROLES = ["USER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function parseUserRole(value: string): UserRole {
  if (!isUserRole(value)) {
    throw new Error(`Invalid user role: ${value}`);
  }
  return value;
}
