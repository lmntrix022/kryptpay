import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { AdminTokenGuard } from '../../auth/admin-token.guard';

import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('internal/users')
@UseGuards(AdminTokenGuard)
export class BootstrapUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }
}

