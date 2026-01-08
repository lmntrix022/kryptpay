import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';

import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async createUser(dto: CreateUserDto) {
    if (dto.role === UserRole.MERCHANT && !dto.merchantId) {
      throw new BadRequestException('merchantId is required for MERCHANT role');
    }

    const passwordHash = await this.authService.hashPassword(dto.password);

    try {
      const user = await this.prisma.users.create({
        data: {
          id: randomUUID(),
          email: dto.email,
          password_hash: passwordHash,
          role: dto.role,
          merchant_id: dto.role === UserRole.MERCHANT ? dto.merchantId : null,
          updated_at: new Date(),
        },
      });

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        merchant_id: user.merchant_id,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Email déjà utilisé');
      }

      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { email } });
  }

  async listUsers() {
    const users = await this.prisma.users.findMany({
      include: {
        merchants: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
        merchant_id: user.merchant_id,
        merchantName: user.merchants?.name ?? null,
        createdAt: user.created_at,
    }));
  }
}
