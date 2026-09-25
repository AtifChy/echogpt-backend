import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface EncryptedSecret {
  encryptedApiKey: string;
  apiKeyIv: string;
  apiKeyAuthTag: string;
}

@Injectable()
export class SecretCipherService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = Buffer.from(config.getOrThrow<string>("PROVIDER_ENCRYPTION_KEY_BASE64"), "base64");
    if (this.key.length !== 32) {
      throw new Error("PROVIDER_ENCRYPTION_KEY_BASE64 must be a base64-encoded 32-byte key");
    }
  }

  encrypt(value: string): EncryptedSecret {
    const iv = randomBytes(12); // AES-GCM standard IV length is 12 bytes
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return {
      encryptedApiKey: encrypted.toString("base64"),
      apiKeyIv: iv.toString("base64"),
      apiKeyAuthTag: cipher.getAuthTag().toString("base64"),
    };
  }

  decrypt(secret: EncryptedSecret): string {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(secret.apiKeyIv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(secret.apiKeyAuthTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(secret.encryptedApiKey, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }
}
