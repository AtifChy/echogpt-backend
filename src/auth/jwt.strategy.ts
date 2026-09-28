import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma.service";

interface AccessPayload {
  sub: number;
  sid: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: AccessPayload): Promise<AuthUser> {
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
      new Date(session.expiresAt) <= new Date()
    ) {
      throw new UnauthorizedException("Session is no longer active");
    }

    return {
      userId: payload.sub,
      sessionId: payload.sid,
      role: session.user.role.name as AuthUser["role"],
    };
  }
}
