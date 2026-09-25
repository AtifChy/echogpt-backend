import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma.service";
import { AnthropicProvider } from "./anthropic.provider";
import type { CreateProviderDto } from "./dto/create-provider.dto";
import type { SetEnabledProviderDto } from "./dto/set-enabled-provider.dto";
import type { UpdateProviderDto } from "./dto/update-provider.dto";
import { GeminiProvider } from "./gemini.provider";
import { OpenAiProvider } from "./openai.provider";
import type { ProviderAdapter, ProviderPrompt } from "./provider.interface";
import type { EncryptedSecret } from "./secret-cipher.service";
import { SecretCipherService } from "./secret-cipher.service";

interface ProvidersResponse {
  id: number;
  name: string;
  type: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  hasApiKey: boolean;
}

@Injectable()
export class ProvidersService {
  private readonly adapters: Map<string, ProviderAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: SecretCipherService,
    openai: OpenAiProvider,
    anthropic: AnthropicProvider,
    gemini: GeminiProvider,
  ) {
    this.adapters = new Map<string, ProviderAdapter>([
      [openai.type, openai],
      [anthropic.type, anthropic],
      [gemini.type, gemini],
    ]);
  }

  list() {
    return this.prisma.db.orm.public.AiProvider.select(
      "id",
      "name",
      "type",
      "model",
      "enabled",
      "isDefault",
      "createdAt",
      "updatedAt",
    ).all();
  }

  async create(dto: CreateProviderDto) {
    if (!this.adapters.has(dto.type)) {
      throw new BadRequestException(`Unsupported provider: ${dto.type}`);
    }
    const secret = this.cipher.encrypt(dto.apiKey);
    const provider = await this.prisma.db.orm.public.AiProvider.create({
      name: dto.name,
      type: dto.type,
      model: dto.model,
      ...secret,
      enabled: dto.enabled ?? false,
      isDefault: false,
    });
    return this.safe(provider);
  }

  async update(id: number, dto: UpdateProviderDto) {
    const provider = await this.find(id);
    const secret: EncryptedSecret = dto.apiKey
      ? this.cipher.encrypt(dto.apiKey)
      : {
          encryptedApiKey: provider.encryptedApiKey,
          apiKeyIv: provider.apiKeyIv,
          apiKeyAuthTag: provider.apiKeyAuthTag,
        };
    await this.prisma.db.orm.public.AiProvider.where({ id }).update({
      name: dto.name ?? provider.name,
      model: dto.model ?? provider.model,
      ...secret,
    });
    return this.getSafe(id);
  }

  async remove(id: number) {
    const provider = await this.find(id);
    if (provider.isDefault) throw new ConflictException("Choose another default procider first");
    await this.prisma.db.orm.public.AiProvider.where({ id }).delete();
  }

  async setEnabled(id: number, dto: SetEnabledProviderDto) {
    await this.find(id);
    await this.prisma.db.orm.public.AiProvider.where({ id }).update({ enabled: dto.enabled });
    return this.getSafe(id);
  }

  async setDefault(id: number) {
    const provider = await this.find(id);
    if (!provider.enabled) throw new ConflictException("Provider is disabled");
    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.AiProvider.where({ isDefault: true }).update({ isDefault: false });
      await tx.orm.public.AiProvider.where({ id }).update({ isDefault: true });
    });
    return this.getSafe(id);
  }

  async generate(id: number, prompt: string): Promise<ProviderPrompt> {
    const provider = await this.find(id);
    if (!provider.enabled) throw new ConflictException("Provider is disabled");
    const adapter = this.adapters.get(provider.type);
    if (!adapter) throw new BadRequestException(`Unsupported provider: ${provider.type}`);
    return {
      apiKey: this.cipher.decrypt(provider),
      model: provider.model,
      prompt,
    };
  }

  async resolveId(id?: number) {
    if (id) {
      const provider = await this.find(id);
      if (!provider.enabled) throw new ConflictException("Provider is disabled");
      return provider.id;
    }
    const provider = await this.prisma.db.orm.public.AiProvider.where({
      enabled: true,
      isDefault: true,
    }).first();
    if (!provider) throw new NotFoundException("No default provider configured");
    return provider.id;
  }

  async health(id: number) {
    const startedAt = Date.now();
    await this.generate(id, "Reply with only: 'OK'");
    return { status: "ok", latency: Date.now() - startedAt };
  }

  private async find(id: number) {
    const provider = await this.prisma.db.orm.public.AiProvider.where({ id }).first();
    if (!provider) throw new NotFoundException("Provider not found");
    return provider;
  }

  private async getSafe(id: number) {
    const provider = await this.find(id);
    return this.safe(provider);
  }

  private safe(provider: Omit<ProvidersResponse, "hasApiKey">): ProvidersResponse {
    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      model: provider.model,
      enabled: provider.enabled,
      isDefault: provider.isDefault,
      hasApiKey: true,
    };
  }
}
