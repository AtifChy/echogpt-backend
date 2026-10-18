import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import {
  ApiBadRequestDocs,
  ApiForbiddenDocs,
  ApiNotFoundDocs,
  ApiUnauthorizedDocs,
} from "../common/swagger-errors";
import { AdminService } from "./admin.service";
import {
  AdminSubscriptionsResponseDto,
  AdminUsersResponseDto,
  UpdatedUserStatusResponseDto,
} from "./dto/admin-response.dto";
import { DashboardResponseDto } from "./dto/dashboard-response.dto";
import { PaginationDto } from "./dto/pagination.dto";
import { SystemHealthResponseDto } from "./dto/system-health-response.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { RequestLogsResponseDto } from "./dto/usage-log-response.dto";

@ApiTags("admin")
@ApiBearerAuth()
@ApiUnauthorizedDocs()
@ApiForbiddenDocs()
@Roles("ADMIN")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get dashboard statistics" })
  @ZodResponse({
    status: 200,
    type: DashboardResponseDto,
  })
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("users")
  @ApiOperation({ summary: "List users" })
  @ZodResponse({
    status: 200,
    type: AdminUsersResponseDto,
  })
  @ApiBadRequestDocs()
  users(@Query() query: PaginationDto) {
    return this.admin.users(query);
  }

  @Patch("users/:id/status")
  @ApiOperation({ summary: "Activate or suspend a user" })
  @ZodResponse({
    status: 200,
    type: UpdatedUserStatusResponseDto,
    description: "User status updated; suspension revokes every session",
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("User not found")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto) {
    return this.admin.updateUserStatus(id, dto.status);
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "List subscriptions" })
  @ZodResponse({
    status: 200,
    type: AdminSubscriptionsResponseDto,
  })
  @ApiBadRequestDocs()
  subscriptions(@Query() query: PaginationDto) {
    return this.admin.subscriptions(query);
  }

  @Get("request-logs")
  @ApiOperation({ summary: "List API request logs" })
  @ZodResponse({
    status: 200,
    type: RequestLogsResponseDto,
  })
  @ApiBadRequestDocs()
  requestLogs(@Query() query: PaginationDto) {
    return this.admin.requestLogs(query);
  }

  @Get("health")
  @ApiOperation({ summary: "Get application and database health details" })
  @ZodResponse({
    status: 200,
    type: SystemHealthResponseDto,
  })
  health() {
    return this.admin.health();
  }
}
