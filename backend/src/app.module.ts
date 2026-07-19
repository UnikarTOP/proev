import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StationsModule } from './stations/stations.module';
import { ServiceProvidersModule } from './service-providers/service-providers.module';
import { LeadsModule } from './leads/leads.module';
import { ArticlesModule } from './articles/articles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StationsModule,
    ServiceProvidersModule,
    LeadsModule,
    ArticlesModule,
  ],
})
export class AppModule {}
