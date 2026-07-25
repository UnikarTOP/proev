import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [PartnersController],
})
export class PartnersModule {}
