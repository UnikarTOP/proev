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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
