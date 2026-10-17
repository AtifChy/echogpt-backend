import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { argon2id, hash, verify } from "argon2";

import { PrismaService } from "../prisma.service";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { ProfileResponseDto } from "./dto/profile-response.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: number): Promise<ProfileResponseDto> {
    const user = await this.prisma.db.orm.public.User.where({ id: userId })
      .select("id", "email", "displayName", "status", "createdAt")
      .include("role", (role) => role.select("name"))
      .first();

    if (!user) throw new NotFoundException("User not found");

    if (!user.role) throw new InternalServerErrorException("User role not found");

    return { ...user, role: user.role };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    await this.findMe(userId);
    await this.prisma.db.orm.public.User.where({ id: userId }).update({
      displayName: dto.displayName?.trim() || null,
    });
    return this.findMe(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.db.orm.public.User.where({ id: userId }).first();
    if (!user) throw new NotFoundException("User not found");
    if (!(await verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.User.where({ id: userId }).update({
        passwordHash: await hash(dto.newPassword, { type: argon2id }),
      });
      await tx.orm.public.Session.where({ userId }).updateAll({
        revokedAt: new Date().toISOString(),
      });
    });
  }

  async deleteAccount(userId: number) {
    await this.prisma.db.orm.public.User.where({ id: userId }).delete();
  }
}
