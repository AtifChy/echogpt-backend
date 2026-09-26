import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { ApiBadRequestDocs, ApiConflictDocs, ApiUnauthorizedDocs } from "../common/swagger-errors";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

const authResponseExample = {
  user: {
    id: 1,
    email: "user@example.com",
    displayName: "Atif",
    role: "USER",
  },
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refreshToken: "opaque-refresh-token",
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a user account" })
  @ApiCreatedResponse({
    description: "Account, subscription, session, and token pair created",
    schema: { example: authResponseExample },
  })
  @ApiBadRequestDocs()
  @ApiConflictDocs("Email is already registered")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in with email and password" })
  @ApiOkResponse({
    description: "Authenticated user and token pair returned",
    schema: { example: authResponseExample },
  })
  @ApiBadRequestDocs()
  @ApiUnauthorizedDocs("Invalid email or password")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate a refresh token" })
  @ApiOkResponse({
    description: "Previous refresh token invalidated and a new token pair returned",
    schema: {
      example: {
        accessToken: authResponseExample.accessToken,
        refreshToken: authResponseExample.refreshToken,
      },
    },
  })
  @ApiBadRequestDocs()
  @ApiUnauthorizedDocs("Refresh token is invalid, expired, or already used")
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Log out the current session" })
  @ApiNoContentResponse({ description: "Session revoked" })
  @ApiUnauthorizedDocs()
  async logout(@CurrentUser() user: AuthUser) {
    await this.auth.logout(user.sessionId);
  }
}
