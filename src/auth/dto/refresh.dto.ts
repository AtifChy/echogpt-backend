import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class RefreshDto {
  @ApiProperty({ description: "Opaque refresh token returned by login" })
  @IsString()
  @MinLength(40)
  refreshToken!: string;
}
