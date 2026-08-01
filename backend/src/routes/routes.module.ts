import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({ controllers: [RoutesController], providers: [PrismaService] })
export class RoutesModule {}
