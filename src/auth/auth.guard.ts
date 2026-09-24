import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma.service";

interface AccessPayload {
  sub: number;
  sid: number;
  role: "USER" | "ADMIN";
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
    }>();
    const [schema, token] = request.headers.authorization?.split(" ") ?? [];

    if (schema !== "Bearer" || !token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token);
      const session = await this.prisma.db.orm.public.Session.where({
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
      })
        .include("user", (user) => user.include("role"))
        .first();

      if (
        !session ||
        session.user?.status !== "ACTIVE" ||
        new Date(session.expiresAt) < new Date()
      ) {
        throw new UnauthorizedException("Session is no longer active");
      }

      request.user = {
        userId: payload.sub,
        sessionId: payload.sid,
        role: session.user.role.name as AuthUser["role"],
      };

      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
