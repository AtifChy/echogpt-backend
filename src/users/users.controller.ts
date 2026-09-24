import { Body, Controller, Delete, Get, HttpCode, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UserService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get("me")
  findMe(@CurrentUser() user: AuthUser) {
    return this.users.findMe(user.userId);
  }

  @Patch("me")
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto);
  }

  @Patch("me/password")
  @HttpCode(204)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(user.userId, dto);
  }

  @Delete("me")
  @HttpCode(204)
  async deleteAccount(@CurrentUser() user: AuthUser) {
    await this.users.deleteAccount(user.userId);
  }
}
