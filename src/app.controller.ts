import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";

import { RootResponseDto } from "./common/dto/status-response.dto";

@ApiTags("app")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: "Identify the EchoGPT API" })
  @ZodResponse({
    status: 200,
    type: RootResponseDto,
    description: "API identification message",
  })
  getRoot() {
    return {
      message: "EchoGPT API" as const,
    };
  }
}
