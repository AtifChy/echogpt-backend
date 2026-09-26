import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("app")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: "Identify the EchoGPT API" })
  @ApiOkResponse({
    description: "API identification message",
    schema: { example: { message: "EchoGPT API" } },
  })
  getRoot() {
    return {
      message: "EchoGPT API",
    };
  }
}
