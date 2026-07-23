import { Global, Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';

@Global()
@Module({
  providers: [IntegrationsService],
  exports: [IntegrationsService],
  controllers: [IntegrationsController],
})
export class IntegrationsModule {}
