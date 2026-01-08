import { IsEmail, IsEnum, IsOptional, IsString, IsStrongPassword } from 'class-validator';
import { UserRole } from '@prisma/client';

import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from '../../../auth/password-policy';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsStrongPassword(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  merchantId?: string;
}
