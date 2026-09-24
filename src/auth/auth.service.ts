import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { argon2id, hash, verify } from "argon2";
import { createHash, randomBytes } from "node:crypto";

import type { UserRole } from "../common/user-role";
import { PrismaService } from "../prisma.service";
import type { AuthResponse, AuthResponseUser } from "./auth.type";
import type { LoginDto } from "./dto/login.dto";
import type { RefreshDto } from "./dto/refresh.dto";
import type { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.db.orm.public.User.where({ email }).first();
    if (existing) throw new ConflictException("Email is already registered");

    const role = await this.prisma.db.orm.public.Role.where({ name: "USER" }).first();
    if (!role) throw new Error("USER role has not been seeded");

    const passwordHash = await hash(dto.password, { type: argon2id });
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

    const user = await this.prisma.db.transaction(async (tx) => {
      const created = await tx.orm.public.User.create({
        email,
        passwordHash,
        displayName: dto.displayName?.trim() || undefined,
        status: "ACTIVE",
        roleId: role.id,
      });
      await tx.orm.public.Subscription.create({
        userId: created.id,
        plan: "FREE",
        status: "ACTIVE",
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
      });
      return created;
    });

    return this.createSession({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: role.name as UserRole,
    });
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.db.orm.public.User.where({ email }).include("role").first();

    if (!user || user.status !== "ACTIVE" || !(await verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.createSession({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role.name as UserRole,
    });
  }

  async refresh(dto: RefreshDto): Promise<Omit<AuthResponse, "user">> {
    const tokenHash = this.digest(dto.refreshToken);
    const session = await this.prisma.db.orm.public.Session.where({ tokenHash })
      .include("user", (user) => user.include("role"))
      .first();

    if (
      !session ||
      session.revokedAt ||
      session.user?.status !== "ACTIVE" ||
      new Date(session.expiresAt) <= new Date()
    ) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const nextToken = randomBytes(32).toString("base64url");
    await this.prisma.db.orm.public.Session.where({ id: session.id }).update({
      tokenHash: this.digest(nextToken),
    });

    return {
      accessToken: await this.signAccessToken(
        session.userId,
        session.id,
        session.user.role.name as UserRole,
      ),
      refreshToken: nextToken,
    };
  }

  async logout(sessionId: number) {
    await this.prisma.db.orm.public.Session.where({ id: sessionId }).update({
      revokedAt: new Date().toISOString(),
    });
  }

  private async createSession(user: AuthResponseUser): Promise<AuthResponse> {
    const refreshToken = randomBytes(32).toString("base64url");
    const days = this.config.get<number>("REFRESH_TOKEN_TTL_DAYS", 30);
    const expiresAt = new Date(Date.now() + days * 86_400_000);
    const session = await this.prisma.db.orm.public.Session.create({
      userId: user.id,
      tokenHash: this.digest(refreshToken),
      expiresAt: expiresAt.toISOString(),
      revokedAt: null,
    });

    return {
      user,
      accessToken: await this.signAccessToken(user.id, session.id, user.role),
      refreshToken,
    };
  }

  private signAccessToken(userId: number, sessionId: number, role: UserRole) {
    return this.jwt.signAsync(
      { sub: userId, sid: sessionId, role },
      { expiresIn: this.config.get<string>("JWT_ACCESS_TTL", "15m") as never },
    );
  }

  private digest(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
