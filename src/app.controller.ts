import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("app")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: "Identify the EchoGPT API" })
  getRoot() {
    return {
      message: "EchoGPT API" as const,
    };
  }
}
