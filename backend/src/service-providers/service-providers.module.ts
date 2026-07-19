import { Module } from '@nestjs/common';
import { ServiceProvidersController } from './service-providers.controller';
import { ServiceProvidersService } from './service-providers.service';

@Module({
  controllers: [ServiceProvidersController],
  providers: [ServiceProvidersService],
})
export class ServiceProvidersModule {}
