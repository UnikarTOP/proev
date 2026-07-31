import { Module } from '@nestjs/common';
import { EvModelsController } from './ev-models.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({ controllers: [EvModelsController], providers: [PrismaService] })
export class EvModelsModule {}
