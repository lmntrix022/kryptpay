import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FiltersService } from './filters.service';
import { FiltersController } from './filters.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FiltersController],
  providers: [FiltersService],
  exports: [FiltersService],
})
export class FiltersModule {}


