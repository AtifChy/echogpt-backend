import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { ApiBadRequestDocs, ApiNotFoundDocs, ApiUnauthorizedDocs } from "../common/swagger-errors";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UserService } from "./users.service";

const profileExample = {
  id: 1,
  email: "user@example.com",
  displayName: "Atif",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  role: { name: "USER" },
};

@ApiTags("users")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get("me")
  @ApiOperation({ summary: "Get the current user's profile" })
  @ApiOkResponse({
    description: "Current user profile",
    schema: { example: profileExample },
  })
  @ApiNotFoundDocs("User not found")
  findMe(@CurrentUser() user: AuthUser) {
    return this.users.findMe(user.userId);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update the current user's profile" })
  @ApiOkResponse({
    description: "Updated user profile",
    schema: { example: { ...profileExample, displayName: "Updated name" } },
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("User not found")
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.userId, dto);
  }

  @Patch("me/password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change the current user's password" })
  @ApiNoContentResponse({
    description: "Password changed and all user sessions revoked",
  })
  @ApiBadRequestDocs()
  @ApiUnauthorizedDocs("Access token or current password is invalid")
  @ApiNotFoundDocs("User not found")
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(user.userId, dto);
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete the current user's account" })
  @ApiNoContentResponse({
    description: "Account and its dependent records deleted",
  })
  async deleteAccount(@CurrentUser() user: AuthUser) {
    await this.users.deleteAccount(user.userId);
  }
}
