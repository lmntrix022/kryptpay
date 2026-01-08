import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SandboxWebhooksService } from './sandbox-webhooks.service';
import { SandboxController } from './sandbox.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SandboxController],
  providers: [SandboxWebhooksService],
  exports: [SandboxWebhooksService],
})
export class SandboxModule {}


