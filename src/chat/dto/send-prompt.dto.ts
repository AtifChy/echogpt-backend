import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class SendPromptDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  conversationId!: number;

  @ApiProperty({ maxLength: 20_000 })
  @IsString()
  @Length(1, 20_000)
  prompt!: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  webSearch?: boolean;
}
