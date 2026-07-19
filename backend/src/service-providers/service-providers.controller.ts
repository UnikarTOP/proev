import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServiceProvidersService } from './service-providers.service';

@Controller('service-providers')
export class ServiceProvidersController {
  constructor(private readonly service: ServiceProvidersService) {}

  @Get()
  findAll(@Query('category') category?: string, @Query('city') city?: string) {
    return this.service.findAll({ categorySlug: category, city });
  }

  @Get('categories')
  categories() {
    return this.service.categories();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
