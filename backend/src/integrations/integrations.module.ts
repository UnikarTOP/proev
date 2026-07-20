import { Global, Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

// @Global — сервис нужен из разных мест (импорт станций, будущие карты и
// т.д.), проще сделать доступным везде, чем импортировать модуль каждый раз.
@Global()
@Module({
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
