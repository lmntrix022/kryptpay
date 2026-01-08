import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, IsStrongPassword, MinLength } from 'class-validator';

import { AuthService, AuthResponse } from './auth.service';
import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from './password-policy';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @IsStrongPassword(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto): Promise<{ ok: boolean }> {
    await this.authService.logout(dto.refreshToken);
    return { ok: true };
  }

  @Post('password/request')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<{ ok: boolean }> {
    await this.authService.requestPasswordReset(dto.email);
    return { ok: true };
  }

  @Post('password/reset')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: boolean }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { ok: true };
  }
}
