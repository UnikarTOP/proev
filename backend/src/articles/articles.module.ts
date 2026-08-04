import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({ controllers: [ArticlesController], providers: [PrismaService] })
export class ArticlesModule {}
