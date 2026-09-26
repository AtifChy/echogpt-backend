import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Check public API health" })
  @ApiOkResponse({
    description: "The API process is healthy",
    schema: {
      example: {
        status: "ok",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    },
  })
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
