import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import { HealthResponseDto } from "../common/dto/status-response.dto";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Check public API health" })
  @ZodResponse({
    status: 200,
    type: HealthResponseDto,
  })
  check(): HealthResponseDto {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
