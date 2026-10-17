import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import type { AuthUser } from "../common/auth-user";
import { CurrentUser } from "../common/current-user.decorator";
import { ApiBadRequestDocs, ApiConflictDocs, ApiUnauthorizedDocs } from "../common/swagger-errors";
import { AuthService } from "./auth.service";
import { AuthResponseDto, TokenPairResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a user account" })
  @ZodResponse({
    status: HttpStatus.CREATED,
    type: AuthResponseDto,
    description: "Account, subscription, session, and token pair created",
  })
  @ApiBadRequestDocs()
  @ApiConflictDocs("Email is already registered")
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @ApiOperation({ summary: "Log in with email and password" })
  @ZodResponse({
    status: HttpStatus.OK,
    type: AuthResponseDto,
    description: "Authenticated user and token pair",
  })
  @ApiBadRequestDocs()
  @ApiUnauthorizedDocs("Invalid email or password")
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Rotate a refresh token" })
  @ZodResponse({
    status: HttpStatus.OK,
    type: TokenPairResponseDto,
    description: "Rotated token pair",
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
