import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailService } from './services/email.service';
import { NotificationService } from './services/notification.service';
import { NotificationHistoryService } from './services/notification-history.service';
import { NotificationPreferencesService } from './services/notification-preferences.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    EmailService,
    NotificationService,
    NotificationHistoryService,
    NotificationPreferencesService,
  ],
  exports: [
    EmailService,
    NotificationService,
    NotificationHistoryService,
    NotificationPreferencesService,
  ],
})
export class NotificationsModule {}

