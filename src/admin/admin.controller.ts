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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

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
import { PaginationDto } from "./dto/pagination.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

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
  @ApiOkResponse({
    description: "System-wide entity and request counts",
    schema: { example: { users: 120, conversations: 640, searches: 310, requests: 1_250 } },
  })
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("users")
  @ApiOperation({ summary: "List users" })
  @ApiOkResponse({
    description: "Paginated user list without password hashes",
    schema: {
      example: [
        {
          id: 1,
          email: "user@example.com",
          displayName: "Atif",
          status: "ACTIVE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          role: { name: "USER" },
          subscriptions: {
            plan: "FREE",
            status: "ACTIVE",
            currentPeriodStart: "2026-01-01T00:00:00.000Z",
            currentPeriodEnd: "2026-02-01T00:00:00.000Z",
          },
        },
      ],
    },
  })
  @ApiBadRequestDocs()
  users(@Query() query: PaginationDto) {
    return this.admin.users(query);
  }

  @Patch("users/:id/status")
  @ApiOperation({ summary: "Activate or suspend a user" })
  @ApiParam({ name: "id", type: Number, description: "User ID" })
  @ApiOkResponse({
    description: "User status updated; suspension revokes every session",
    schema: { example: { id: 1, status: "SUSPENDED" } },
  })
  @ApiBadRequestDocs()
  @ApiNotFoundDocs("User not found")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto) {
    return this.admin.updateUserStatus(id, dto.status);
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "List subscriptions" })
  @ApiOkResponse({
    description: "Paginated subscription list",
    schema: {
      example: [
        {
          id: 1,
          userId: 1,
          plan: "FREE",
          status: "ACTIVE",
          currentPeriodStart: "2026-01-01T00:00:00.000Z",
          currentPeriodEnd: "2026-02-01T00:00:00.000Z",
          user: { email: "user@example.com", displayName: "Atif" },
        },
      ],
    },
  })
  @ApiBadRequestDocs()
  subscriptions(@Query() query: PaginationDto) {
    return this.admin.subscriptions(query);
  }

  @Get("request-logs")
  @ApiOperation({ summary: "List API request logs" })
  @ApiOkResponse({
    description: "Paginated sanitized request logs",
    schema: {
      example: [
        {
          requestId: 1,
          userId: 1,
          providerId: 1,
          operation: "CHAT",
          status: "SUCCESS",
          latencyMs: 245,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    },
  })
  @ApiBadRequestDocs()
  requestLogs(@Query() query: PaginationDto) {
    return this.admin.requestLogs(query);
  }

  @Get("health")
  @ApiOperation({ summary: "Get application and database health details" })
  @ApiOkResponse({
    description: "Runtime and database health",
    schema: {
      example: {
        status: "ok",
        database: "up",
        databaseLatencyMs: 2,
        uptimeSeconds: 3600,
        memory: {
          rss: 120_000_000,
          heapTotal: 60_000_000,
          heapUsed: 45_000_000,
          external: 2_000_000,
          arrayBuffers: 100_000,
        },
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    },
  })
  health() {
    return this.admin.health();
  }
}
