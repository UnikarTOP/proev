import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({ controllers: [TripsController], providers: [PrismaService] })
export class TripsModule {}
