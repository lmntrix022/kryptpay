import { IsOptional, IsString } from 'class-validator';

export class TestMonerooCredentialsDto {
  @IsString()
  secretKey!: string;

  @IsOptional()
  @IsString()
  publicKey?: string;
}


