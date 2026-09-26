import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "strongpassword" })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ minLength: 10, example: "newstrongpassword" })
  @IsString()
  @MinLength(10)
  newPassword!: string;
}
