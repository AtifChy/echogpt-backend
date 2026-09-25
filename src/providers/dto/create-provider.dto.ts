import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsOptional, IsString, Length, MinLength } from "class-validator";

export class CreateProviderDto {
  @ApiProperty({ example: "Primary OpenAI" })
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({ enum: ["OPENAI", "ANTHROPIC", "GEMINI"] })
  @IsIn(["OPENAI", "ANTHROPIC", "GEMINI"])
  type!: "OPENAI" | "ANTHROPIC" | "GEMINI";

  @ApiProperty({ example: "gpt-5" })
  @IsString()
  @Length(1, 100)
  model!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(10)
  apiKey!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
