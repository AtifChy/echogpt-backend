import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 10, example: "strongpassword" })
  @IsString()
  @MinLength(10)
  password!: string;

  @ApiPropertyOptional({ example: "Atif" })
  @IsOptional()
  @IsString()
  @Length(1, 90)
  displayName?: string;
}
