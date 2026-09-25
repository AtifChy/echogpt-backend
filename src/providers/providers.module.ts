import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { RolesGuard } from "../common/roles.guard";
import { AnthropicProvider } from "./anthropic.provider";
import { GeminiProvider } from "./gemini.provider";
import { OpenAiProvider } from "./openai.provider";
import { ProvidersController } from "./providers.controller";
import { ProvidersService } from "./providers.service";
import { SecretCipherService } from "./secret-cipher.service";

@Module({
  imports: [AuthModule],
  controllers: [ProvidersController],
  providers: [
    ProvidersService,
    SecretCipherService,
    OpenAiProvider,
    AnthropicProvider,
    GeminiProvider,
    RolesGuard,
  ],
  exports: [ProvidersService],
})
export class ProvidersModule {}
