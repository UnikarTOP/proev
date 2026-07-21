import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  findAll(@Query('city') city?: string, @Query('connector') connector?: string) {
    return this.stationsService.findAll({ city, connector });
  }

  @Get('nearby')
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ) {
    return this.stationsService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radius ? parseFloat(radius) : undefined,
    );
  }

  @Get('stats')
  getStats() {
    return this.stationsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stationsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStationDto) {
    // TODO: userId брать из auth-guard, когда появится авторизация
    return this.stationsService.create(dto);
  }

  @Post(':id/reviews')
  addReview(@Param('id') id: string, @Body() dto: CreateReviewDto) {
    // TODO: userId брать из auth-guard
    return this.stationsService.addReview(id, dto, 'anonymous');
  }
}
