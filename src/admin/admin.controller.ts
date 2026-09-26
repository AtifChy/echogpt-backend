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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AdminService } from "./admin.service";
import { PaginationDto } from "./dto/pagination.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@ApiTags("admin")
@ApiBearerAuth()
@Roles("ADMIN")
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("dashboard")
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("users")
  users(@Query() query: PaginationDto) {
    return this.admin.users(query);
  }

  @Patch("users/:id/status")
  updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto) {
    return this.admin.updateUserStatus(id, dto.status);
  }

  @Get("subscriptions")
  subscriptions(@Query() query: PaginationDto) {
    return this.admin.subscriptions(query);
  }

  @Get("request-logs")
  requestLogs(@Query() query: PaginationDto) {
    return this.admin.requestLogs(query);
  }

  @Get("health")
  health() {
    return this.admin.health();
  }
}
