import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ServiceProvidersService } from './service-providers.service';

class CreateReviewDto {
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() text?: string;
  @IsOptional() @IsString() authorId?: string;
}

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

  // Маршрут по slug для лендинга — /api/service-providers/slug/:slug
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Добавить отзыв на партнёра
  @Post(':id/reviews')
  addReview(@Param('id') id: string, @Body() dto: CreateReviewDto) {
    return this.service.addReview(id, dto);
  }
}
