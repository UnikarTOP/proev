import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StationsModule } from './stations/stations.module';
import { ServiceProvidersModule } from './service-providers/service-providers.module';
import { LeadsModule } from './leads/leads.module';
import { ArticlesModule } from './articles/articles.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NewsModule } from './news/news.module';
import { PartnersModule } from './partners/partners.module';
import { UploadModule } from './upload/upload.module';
import { ProviderBlogModule } from './provider-blog/provider-blog.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PublicApiModule } from './public-api/public-api.module';
import { OcpiModule } from './ocpi/ocpi.module';
import { GeoipModule } from './geoip/geoip.module';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting: 20 запросов / 60 секунд глобально
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    // JWT — глобальный модуль
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'change-me-jwt-secret',
      signOptions: { expiresIn: '7d' },
    }),
    PrismaModule,
    StationsModule,
    ServiceProvidersModule,
    LeadsModule,
    ArticlesModule,
    IntegrationsModule,
    NewsModule,
    PartnersModule,
    UploadModule,
    ProviderBlogModule,
    NotificationsModule,
    PublicApiModule,
    OcpiModule,
    GeoipModule,
  ],
  providers: [
    // Rate limiting применяется глобально
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
