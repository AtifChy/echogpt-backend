import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthUser } from "./auth-user";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AuthUser["role"][]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles.length) return true;

    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenException("Insufficient permissions to access this resource");
    }
    return true;
  }
}
